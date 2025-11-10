

import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, Loader2, AlertTriangle, ScrollText, HardDrive } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const SQL_SCRIPT = `-- B.M. Contigo - Script de Inicialización de Base de Datos para Supabase
-- Versión 1.5.2
-- Este script es RE-EJECUTABLE.
-- v1.5.2: [FIX CRÍTICO] Añade política de INSERT en Storage para usuarios autenticados, solucionando el error de aprobación de préstamos.
-- v1.5.1: Corrige error de RLS en funciones al cambiar de SECURITY DEFINER a SECURITY INVOKER (por defecto).
-- v1.5.0: Añade campos a la tabla 'clients' y la función 'create_client_and_loan' para registrar clientes desde el panel.
-- v1.4.0: Cambia la función 'approve_request' para actualizar el estado de la solicitud a 'Aprobado' en lugar de eliminarla.
-- v1.3.0: Añade tablas 'accounting_entries' y 'app_meta' para la nueva funcionalidad de contabilidad.
-- v1.2.0: Agrega política de lectura pública a la tabla 'requests'.
-- v1.1.0: Soluciona el error "violates row-level security policy" limpiando las políticas antiguas.

-- 1. CREACIÓN Y MODIFICACIÓN DE TABLAS

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
    join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS id_number TEXT, ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS requests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, full_name TEXT NOT NULL, id_number TEXT NOT NULL,
    address TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, loan_amount NUMERIC NOT NULL, loan_reason TEXT,
    employment_status TEXT, contract_type TEXT, front_id_url TEXT NOT NULL, back_id_url TEXT NOT NULL,
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'Pendiente', signature TEXT
);

CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL, amount NUMERIC NOT NULL, interest_rate NUMERIC NOT NULL, term INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'Pendiente',
    monthly_payment NUMERIC NOT NULL, total_repayment NUMERIC NOT NULL, payments_made INTEGER NOT NULL DEFAULT 0,
    signature TEXT, contract_pdf_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounting_entries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'CAPITAL_INJECTION', 'CAPITAL_WITHDRAWAL')),
    description TEXT NOT NULL, amount NUMERIC NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HABILITACIÓN DE SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_meta ENABLE ROW LEVEL SECURITY;

-- 3. LIMPIEZA DE POLÍTICAS ANTIGUAS
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Select" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Delete" ON storage.objects;

DROP POLICY IF EXISTS "Allow admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Allow admin full access on loans" ON loans;
DROP POLICY IF EXISTS "Allow public insert on requests" ON requests;
DROP POLICY IF EXISTS "Allow admin full access on requests" ON requests;
DROP POLICY IF EXISTS "Allow public read access on requests" ON requests;
DROP POLICY IF EXISTS "Allow admin full access on accounting_entries" ON accounting_entries;
DROP POLICY IF EXISTS "Allow admin full access on app_meta" ON app_meta;

-- 4. CREACIÓN DE POLÍTICAS DE ACCESO (CORREGIDAS)

-- Políticas de Almacenamiento (Storage)
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow Authenticated Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow Authenticated Select" ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (true);

-- Políticas de Datos (RLS)
CREATE POLICY "Allow admin full access on clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on loans" ON loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on accounting_entries" ON accounting_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on app_meta" ON app_meta FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert on requests" ON requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read access on requests" ON requests FOR SELECT TO anon USING (true);
CREATE POLICY "Allow admin full access on requests" ON requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. FUNCIONES DE BASE DE DATOS PARA TRANSACCIONES

CREATE OR REPLACE FUNCTION approve_request(
    p_request_id BIGINT, p_loan_amount NUMERIC, p_loan_term INTEGER, p_contract_pdf_url TEXT,
    p_request_signature TEXT, p_front_id_url TEXT, p_back_id_url TEXT
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_request record; v_new_client_id UUID; v_monthly_interest_rate NUMERIC := 0.08;
    v_monthly_payment NUMERIC; v_total_repayment NUMERIC;
BEGIN
    SELECT * INTO v_request FROM public.requests WHERE id = p_request_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud con ID % no encontrada', p_request_id; END IF;
    
    v_monthly_payment := (p_loan_amount * v_monthly_interest_rate) / (1 - POWER(1 + v_monthly_interest_rate, -p_loan_term));
    v_total_repayment := v_monthly_payment * p_loan_term;

    INSERT INTO public.clients (name, id_number, phone, address, email)
    VALUES (v_request.full_name, v_request.id_number, v_request.phone, v_request.address, v_request.email)
    RETURNING id INTO v_new_client_id;

    INSERT INTO public.loans (client_id, client_name, amount, interest_rate, term, monthly_payment, total_repayment, signature, contract_pdf_url)
    VALUES (v_new_client_id, v_request.full_name, p_loan_amount, 96, p_loan_term, ROUND(v_monthly_payment, 2), ROUND(v_total_repayment, 2), p_request_signature, p_contract_pdf_url);

    UPDATE public.requests SET status = 'Aprobado' WHERE id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_client_and_loan(
    p_client_name TEXT, p_client_id_number TEXT, p_client_phone TEXT, p_client_address TEXT, p_client_email TEXT,
    p_loan_amount NUMERIC, p_loan_term INTEGER
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    v_new_client_id UUID; v_monthly_interest_rate NUMERIC := 0.08;
    v_monthly_payment NUMERIC; v_total_repayment NUMERIC;
BEGIN
    INSERT INTO public.clients (name, id_number, phone, address, email)
    VALUES (p_client_name, p_client_id_number, p_client_phone, p_client_address, p_client_email)
    RETURNING id INTO v_new_client_id;

    v_monthly_payment := (p_loan_amount * v_monthly_interest_rate) / (1 - POWER(1 + v_monthly_interest_rate, -p_loan_term));
    v_total_repayment := v_monthly_payment * p_loan_term;

    INSERT INTO public.loans (client_id, client_name, amount, interest_rate, term, monthly_payment, total_repayment, status)
    VALUES (v_new_client_id, p_client_name, p_loan_amount, 96, p_loan_term, ROUND(v_monthly_payment, 2), ROUND(v_total_repayment, 2), 'Pendiente');
END;
$$;
`;


const SchemaSetup: React.FC = () => {
    const { verifySetups, supabaseConfig, isSchemaReady, isStorageReady } = useAppContext();
    const [isChecking, setIsChecking] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleRecheck = async () => {
        setIsChecking(true);
        await verifySetups();
        setIsChecking(false);
    };
    
    const handleCopy = () => {
        navigator.clipboard.writeText(SQL_SCRIPT).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }, (err) => {
            console.error('Failed to copy script: ', err);
        });
    };

    const supabaseUrl = supabaseConfig?.url;
    const projectRef = supabaseUrl ? supabaseUrl.match(/https:\/\/(\w+)\.supabase\.co/)?.[1] : null;
    const sqlEditorLink = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'https://supabase.com/dashboard';

    return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 font-sans">
            <div className="w-full max-w-4xl bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-lg text-slate-100 border border-slate-700">
                <div className="text-center mb-6">
                    <Database className="text-primary-400 h-16 w-16 mx-auto" />
                    <h1 className="text-2xl sm:text-3xl font-bold mt-4">Pasos Finales de Configuración</h1>
                    <p className="text-slate-400 mt-2">
                        ¡Conexión exitosa! Ahora solo falta preparar tu base de datos y almacenamiento.
                    </p>
                </div>

                {!isSchemaReady && (
                    <div className="mt-4 p-4 bg-amber-900/50 rounded-lg text-amber-300 text-sm flex items-start border border-amber-500/30">
                        <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-200">Paso 1: Configurar la Base de Datos</p>
                            <p>La aplicación no encontró las tablas necesarias. Por favor, ejecuta el siguiente script SQL para crearlas.</p>
                        </div>
                    </div>
                )}

                {!isStorageReady && (
                    <div className="mt-6 p-4 bg-blue-900/50 rounded-lg text-blue-300 text-sm border border-blue-500/30">
                        <h3 className="font-bold flex items-center text-blue-200"><HardDrive className="mr-2 h-5 w-5"/>Paso {isSchemaReady ? '1' : '2'}: Crear el Bucket de Almacenamiento</h3>
                        <p className="mt-2">
                            Para que la subida de documentos (DNI, contratos) funcione, necesitas crear un "bucket" de almacenamiento.
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>En tu panel de Supabase, ve a la sección <strong>Storage</strong> (icono de cilindro).</li>
                            <li>Haz clic en <strong>"Create a new bucket"</strong>.</li>
                            <li>Nombra el bucket exactamente: <code className="text-xs bg-slate-700 p-1 rounded font-mono">documents</code>.</li>
                            <li><strong>¡Muy importante!</strong> Activa la opción <strong>"Public bucket"</strong> para permitir las subidas desde el formulario.</li>
                        </ul>
                    </div>
                )}

                {!isSchemaReady && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-2 flex items-center"><ScrollText className="mr-2"/>Script SQL para el Paso 1</h2>
                        <div className="relative">
                            <textarea
                                readOnly
                                value={SQL_SCRIPT}
                                rows={10}
                                className="w-full p-3 font-mono text-xs border border-slate-600 rounded-md bg-slate-900 text-slate-300"
                            />
                            <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-slate-600 rounded-md hover:bg-slate-500">
                                {copySuccess ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-slate-300" />}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href={sqlEditorLink} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all hover:scale-105">
                        <ExternalLink className="mr-2 h-5 w-5" />
                        Abrir Editor SQL de Supabase
                    </a>
                    <button
                        onClick={handleRecheck}
                        disabled={isChecking}
                        className="w-full flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all hover:scale-105 disabled:bg-primary-400 disabled:cursor-not-allowed"
                    >
                        {isChecking ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-5 w-s5" />
                        )}
                        {isChecking ? 'Verificando...' : 'He completado los pasos, verificar de nuevo'}
                    </button>
                </div>
                 <div className="mt-6 text-xs text-slate-500 text-center">
                    <p>Una vez que completes los pasos pendientes, haz clic en "Verificar de nuevo" para acceder a la aplicación.</p>
                </div>
            </div>
        </div>
    );
};

export default SchemaSetup;