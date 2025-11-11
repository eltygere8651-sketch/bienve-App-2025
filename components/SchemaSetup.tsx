import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, Key, Link2, Save } from 'lucide-react';
import { saveSupabaseConfig, getSupabaseConfig } from '../services/supabaseService';

const SQL_SCRIPT = `-- B.M. Contigo - Script de Inicialización de Base de Datos para Supabase
-- Versión 1.2.2 (Corrección en aprobación de préstamos)
-- Este script crea las tablas y políticas de seguridad (RLS) necesarias.

-- 1. CREACIÓN DE TABLAS
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), id_number TEXT, phone TEXT, address TEXT, email TEXT
);
DROP TABLE IF EXISTS requests CASCADE;
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), full_name TEXT NOT NULL, id_number TEXT NOT NULL, address TEXT NOT NULL,
    phone TEXT NOT NULL, email TEXT, loan_amount NUMERIC NOT NULL, loan_reason TEXT, employment_status TEXT, contract_type TEXT,
    front_id_url TEXT NOT NULL, back_id_url TEXT NOT NULL, request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL DEFAULT 'Pendiente', signature TEXT
);
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL, interest_rate NUMERIC NOT NULL, term INTEGER NOT NULL, start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pendiente', monthly_payment NUMERIC NOT NULL, total_repayment NUMERIC NOT NULL,
    payments_made INTEGER NOT NULL DEFAULT 0, signature TEXT, contract_pdf_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HABILITACIÓN DE RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- 3. LIMPIEZA DE POLÍTICAS ANTIGUAS
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects; DROP POLICY IF EXISTS "Allow Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin full access on clients" ON clients; DROP POLICY IF EXISTS "Allow admin full access on loans" ON loans;
DROP POLICY IF EXISTS "Allow public insert on requests" ON requests; DROP POLICY IF EXISTS "Allow admin full access on requests" ON requests;
DROP POLICY IF EXISTS "Deny public read on requests" ON requests;

-- 4. CREACIÓN DE POLÍTICAS DE ACCESO
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Allow Public Read Access" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'documents');
CREATE POLICY "Allow admin full access on clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on loans" ON loans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on requests" ON requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert on requests" ON requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Deny public read on requests" ON requests FOR SELECT TO anon USING (false);

-- 5. FUNCIONES DE BD
DROP FUNCTION IF EXISTS approve_request(UUID, NUMERIC, INTEGER, TEXT, TEXT);
CREATE OR REPLACE FUNCTION approve_request(p_request_id UUID, p_loan_amount NUMERIC, p_loan_term INTEGER, p_contract_pdf_url TEXT, p_request_signature TEXT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_request record; v_new_client_id UUID; v_monthly_interest_rate NUMERIC := 0.08; v_annual_interest_rate NUMERIC := 96; v_monthly_payment NUMERIC; v_total_repayment NUMERIC;
BEGIN
    SELECT * INTO v_request FROM public.requests WHERE id = p_request_id; IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
    v_monthly_payment := (p_loan_amount * v_monthly_interest_rate) / (1 - POWER(1 + v_monthly_interest_rate, -p_loan_term)); v_total_repayment := v_monthly_payment * p_loan_term;
    INSERT INTO public.clients (name, id_number, phone, address, email) VALUES (v_request.full_name, v_request.id_number, v_request.phone, v_request.address, v_request.email) RETURNING id INTO v_new_client_id;
    INSERT INTO public.loans (client_id, client_name, amount, interest_rate, term, monthly_payment, total_repayment, signature, contract_pdf_url, status) VALUES (v_new_client_id, v_request.full_name, p_loan_amount, v_annual_interest_rate, p_loan_term, ROUND(v_monthly_payment, 2), ROUND(v_total_repayment, 2), p_request_signature, p_contract_pdf_url, 'Pendiente');
    DELETE FROM public.requests WHERE id = p_request_id;
END;$$;

CREATE OR REPLACE FUNCTION create_client_and_loan(p_client_name TEXT, p_client_id_number TEXT, p_client_phone TEXT, p_client_address TEXT, p_client_email TEXT, p_loan_amount NUMERIC, p_loan_term INTEGER) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_new_client_id UUID; v_monthly_interest_rate NUMERIC := 0.08; v_annual_interest_rate NUMERIC := 96; v_monthly_payment NUMERIC; v_total_repayment NUMERIC;
BEGIN
    INSERT INTO public.clients (name, id_number, phone, address, email) VALUES (p_client_name, p_client_id_number, p_client_phone, p_client_address, p_client_email) RETURNING id INTO v_new_client_id;
    v_monthly_payment := (p_loan_amount * v_monthly_interest_rate) / (1 - POWER(1 + v_monthly_interest_rate, -p_loan_term)); v_total_repayment := v_monthly_payment * p_loan_term;
    INSERT INTO public.loans (client_id, client_name, amount, interest_rate, term, monthly_payment, total_repayment, status) VALUES (v_new_client_id, p_client_name, p_loan_amount, v_annual_interest_rate, p_loan_term, ROUND(v_monthly_payment, 2), ROUND(v_total_repayment, 2), 'Pendiente');
END;$$;

CREATE OR REPLACE FUNCTION get_request_status_by_id_number(p_id_number TEXT) RETURNS TABLE (status TEXT, request_date TIMESTAMPTZ) LANGUAGE plpgsql AS $$
BEGIN RETURN QUERY SELECT r.status, r.request_date FROM public.requests r WHERE r.id_number = p_id_number ORDER BY r.request_date DESC LIMIT 1; END;$$;

-- 6. PERMISOS DE FUNCIONES
GRANT EXECUTE ON FUNCTION approve_request(UUID, NUMERIC, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_client_and_loan(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_request_status_by_id_number(TEXT) TO anon;
`;

const Step: React.FC<{ number: number, title: string, children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex items-center">
            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full font-bold text-lg mr-4">{number}</span>
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="mt-2 pl-12 text-slate-400 text-sm space-y-2">
            {children}
        </div>
    </div>
);


const SchemaSetup: React.FC = () => {
    const [copySqlSuccess, setCopySqlSuccess] = useState(false);
    const [url, setUrl] = useState('');
    const [anonKey, setAnonKey] = useState('');

    useEffect(() => {
        const savedConfig = getSupabaseConfig();
        if (savedConfig) {
            setUrl(savedConfig.url);
            setAnonKey(savedConfig.anonKey);
        }
    }, []);
    
    const handleSaveConfig = () => {
        if (url.trim() && anonKey.trim()) {
            saveSupabaseConfig(url, anonKey);
            window.location.reload();
        }
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            setCopySqlSuccess(true);
            setTimeout(() => setCopySqlSuccess(false), 2000);
        });
    };

    const projectRef = url ? url.match(/https:\/\/(\w+)\.supabase\.co/)?.[1] : null;
    const sqlEditorLink = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : 'https://supabase.com/dashboard';

    return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4 font-sans">
            <div className="w-full max-w-4xl bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-lg text-slate-100 border border-slate-700 backdrop-blur-sm">
                <div className="text-center mb-6">
                    <Database className="text-primary-400 h-16 w-16 mx-auto" />
                    <h1 className="text-2xl sm:text-3xl font-bold mt-4">Configuración Inicial Requerida</h1>
                     <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
                        Para empezar, necesitas conectar la aplicación a tu propia base de datos de Supabase.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                         <h3 className="text-lg font-semibold text-slate-100 mb-3">1. Conecta tu Proyecto Supabase</h3>
                         <div className="bg-slate-900/50 p-3 rounded-md mb-4 text-sm text-slate-300 border-l-4 border-primary-500 space-y-3">
                            <div>
                                <strong className="text-primary-400">Opción 1: Desplegar la aplicación (Recomendado)</strong>
                                <p className="mt-1">
                                    Edita el archivo <code className="bg-slate-700 text-amber-300 px-1 rounded-sm text-xs">services/supabaseConfig.ts</code> con tus credenciales.
                                    Así, tus usuarios nunca verán esta pantalla.
                                </p>
                            </div>
                            <div>
                                <strong className="text-slate-400">Opción 2: Probar localmente</strong>
                                <p className="mt-1">
                                    Usa el formulario de abajo. Tu configuración se guardará solo en este navegador.
                                </p>
                            </div>
                        </div>
                         <div className="space-y-4">
                            <div>
                                 <label htmlFor="supabase-url" className="block text-sm font-medium text-slate-300 mb-1">URL del Proyecto</label>
                                 <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input id="supabase-url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxxxxx.supabase.co" required className="pl-10 w-full px-4 py-2 border border-slate-600 rounded-md shadow-sm bg-slate-700 text-slate-100" />
                                </div>
                            </div>
                            <div>
                                 <label htmlFor="supabase-key" className="block text-sm font-medium text-slate-300 mb-1">Clave Anónima (anon key)</label>
                                 <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input id="supabase-key" type="password" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="eyJhbGciOi..." required className="pl-10 w-full px-4 py-2 border border-slate-600 rounded-md shadow-sm bg-slate-700 text-slate-100" />
                                </div>
                            </div>
                            <div className="text-right">
                                 <button onClick={handleSaveConfig} disabled={!url.trim() || !anonKey.trim()} className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-bold rounded-lg shadow-md hover:bg-primary-700 disabled:bg-primary-400 transition-colors text-sm">
                                    <Save size={18} className="mr-2" />
                                    Guardar y Conectar
                                </button>
                            </div>
                         </div>
                    </div>
                     <Step number={2} title="Ejecutar el Script de Base de Datos">
                        <p>Copia y ejecuta este script en el editor SQL de Supabase para crear las tablas y políticas de seguridad.</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <button onClick={() => handleCopy(SQL_SCRIPT)} className="inline-flex items-center justify-center px-4 py-2 bg-slate-600 text-slate-100 font-bold rounded-lg hover:bg-slate-500 transition-colors text-sm">
                                {copySqlSuccess ? <Check size={18} className="mr-2 text-green-400" /> : <Copy size={18} className="mr-2" />}
                                {copySqlSuccess ? '¡Copiado!' : 'Copiar Script SQL'}
                            </button>
                             <a href={sqlEditorLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700 transition-all text-sm">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir Editor de Supabase
                            </a>
                        </div>
                    </Step>
                     <Step number={3} title="Crear Bucket de Almacenamiento">
                         <p>En tu panel de Supabase, ve a "Storage" y crea un nuevo bucket público llamado <code className="bg-slate-900 text-amber-300 px-1 rounded-sm text-xs">documents</code>.</p>
                    </Step>
                     <Step number={4} title="Recargar la Aplicación">
                        <p>Una vez completados todos los pasos, recarga esta página para empezar a usar la aplicación.</p>
                         <button onClick={() => window.location.reload()} className="inline-flex items-center justify-center px-4 py-2 bg-slate-600 text-slate-100 font-bold rounded-lg hover:bg-slate-500 transition-colors text-sm mt-2">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recargar Aplicación
                        </button>
                    </Step>
                </div>
            </div>
        </div>
    );
};

export default SchemaSetup;