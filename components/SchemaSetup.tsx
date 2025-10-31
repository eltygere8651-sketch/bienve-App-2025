import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, Loader2, AlertTriangle, ScrollText, HardDrive } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const SQL_SCRIPT = `-- B.M. Contigo - Script de Inicialización de Base de Datos para Supabase
-- Versión 1.1.0
-- Este script es RE-EJECUTABLE. Soluciona el error "violates row-level security policy"
-- limpiando las políticas antiguas y creando las correctas.

-- 1. CREACIÓN DE TABLAS (Se crearán solo si no existen)

-- Tabla para almacenar información de los clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para almacenar las solicitudes de préstamo
CREATE TABLE IF NOT EXISTS requests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    full_name TEXT NOT NULL,
    id_number TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    loan_amount NUMERIC NOT NULL,
    loan_reason TEXT,
    employment_status TEXT,
    contract_type TEXT,
    front_id_url TEXT NOT NULL,
    back_id_url TEXT NOT NULL,
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pendiente',
    signature TEXT
);

-- Tabla para almacenar los préstamos aprobados
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,
    term INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pendiente',
    monthly_payment NUMERIC NOT NULL,
    total_repayment NUMERIC NOT NULL,
    payments_made INTEGER NOT NULL DEFAULT 0,
    signature TEXT,
    contract_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. HABILITACIÓN DE SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- 3. LIMPIEZA DE POLÍTICAS ANTIGUAS
-- Es seguro ejecutar esto incluso si las políticas no existen.

-- Políticas de Storage
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Select" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Delete" ON storage.objects;

-- Políticas de Datos
DROP POLICY IF EXISTS "Allow admin full access on clients" ON clients;
DROP POLICY IF EXISTS "Allow admin full access on loans" ON loans;
DROP POLICY IF EXISTS "Allow public insert on requests" ON requests;
DROP POLICY IF EXISTS "Allow admin full access on requests" ON requests;

-- 4. CREACIÓN DE POLÍTICAS DE ACCESO (CORREGIDAS)

-- Políticas de Almacenamiento (Storage)
-- [CORREGIDO] Permite a usuarios ANÓNIMOS subir archivos a 'documents'.
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'documents');
-- Permite a los administradores autenticados gestionar archivos.
CREATE POLICY "Allow Authenticated Select" ON storage.objects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (true);

-- Políticas de Datos (RLS)
-- Los administradores autenticados tienen acceso total a 'clients' y 'loans'.
CREATE POLICY "Allow admin full access on clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin full access on loans" ON loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- [CORREGIDO] Permite a usuarios ANÓNIMOS crear nuevas solicitudes en 'requests'.
CREATE POLICY "Allow public insert on requests" ON requests FOR INSERT TO anon WITH CHECK (true);
-- Permite a los administradores autenticados gestionar todas las solicitudes.
CREATE POLICY "Allow admin full access on requests" ON requests FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 5. FUNCIÓN DE BASE DE DATOS PARA TRANSACCIONES
-- Esta función asegura que la aprobación de una solicitud sea una operación atómica:
-- O se crea el cliente, se crea el préstamo Y se elimina la solicitud, o no se hace nada.

CREATE OR REPLACE FUNCTION approve_request(
    p_request_id BIGINT,
    p_loan_amount NUMERIC,
    p_loan_term INTEGER,
    p_contract_pdf_url TEXT,
    p_request_signature TEXT,
    p_front_id_url TEXT,
    p_back_id_url TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request record;
    v_new_client_id UUID;
    v_monthly_interest_rate NUMERIC := 0.08; -- 8% mensual (96% anual)
    v_monthly_payment NUMERIC;
    v_total_repayment NUMERIC;
BEGIN
    -- Obtener los detalles de la solicitud
    SELECT * INTO v_request FROM public.requests WHERE id = p_request_id;

    -- Si la solicitud no existe, lanzar un error
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitud con ID % no encontrada', p_request_id;
    END IF;

    -- Calcular los detalles del préstamo
    -- Fórmula de cuota de préstamo (amortización francesa)
    v_monthly_payment := (p_loan_amount * v_monthly_interest_rate) / (1 - POWER(1 + v_monthly_interest_rate, -p_loan_term));
    v_total_repayment := v_monthly_payment * p_loan_term;

    -- Crear un nuevo cliente
    INSERT INTO public.clients (name)
    VALUES (v_request.full_name)
    RETURNING id INTO v_new_client_id;

    -- Crear el nuevo préstamo
    INSERT INTO public.loans (client_id, client_name, amount, interest_rate, term, monthly_payment, total_repayment, signature, contract_pdf_url)
    VALUES (
        v_new_client_id,
        v_request.full_name,
        p_loan_amount,
        96, -- Interés anual (8% * 12)
        p_loan_term,
        ROUND(v_monthly_payment, 2),
        ROUND(v_total_repayment, 2),
        p_request_signature,
        p_contract_pdf_url
    );

    -- Eliminar la solicitud original de la tabla de solicitudes
    DELETE FROM public.requests WHERE id = p_request_id;
END;
$$;

-- Mensaje final
-- ¡La configuración de la base de datos está completa!
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
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans">
            <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl shadow-lg text-gray-800">
                <div className="text-center mb-6">
                    <Database className="text-blue-500 h-16 w-16 mx-auto" />
                    <h1 className="text-2xl sm:text-3xl font-bold mt-4">Pasos Finales de Configuración</h1>
                    <p className="text-gray-600 mt-2">
                        ¡Conexión exitosa! Ahora solo falta preparar tu base de datos y almacenamiento.
                    </p>
                </div>

                {!isSchemaReady && (
                    <div className="mt-4 p-4 bg-amber-100 rounded-lg text-amber-800 text-sm flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Paso 1: Configurar la Base de Datos</p>
                            <p>La aplicación no encontró las tablas necesarias. Por favor, ejecuta el siguiente script SQL para crearlas.</p>
                        </div>
                    </div>
                )}

                {!isStorageReady && (
                    <div className="mt-6 p-4 bg-blue-100 rounded-lg text-blue-800 text-sm">
                        <h3 className="font-bold flex items-center"><HardDrive className="mr-2 h-5 w-5"/>Paso {isSchemaReady ? '1' : '2'}: Crear el Bucket de Almacenamiento</h3>
                        <p className="mt-2">
                            Para que la subida de documentos (DNI, contratos) funcione, necesitas crear un "bucket" de almacenamiento.
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>En tu panel de Supabase, ve a la sección <strong>Storage</strong> (icono de cilindro).</li>
                            <li>Haz clic en <strong>"Create a new bucket"</strong>.</li>
                            <li>Nombra el bucket exactamente: <code className="text-xs bg-gray-200 p-1 rounded font-mono">documents</code>.</li>
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
                                className="w-full p-3 font-mono text-xs border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                            />
                            <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-gray-200 rounded-md hover:bg-gray-300">
                                {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
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
                        className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {isChecking ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-5 w-s5" />
                        )}
                        {isChecking ? 'Verificando...' : 'He completado los pasos, verificar de nuevo'}
                    </button>
                </div>
                 <div className="mt-6 text-xs text-gray-500 text-center">
                    <p>Una vez que completes los pasos pendientes, haz clic en "Verificar de nuevo" para acceder a la aplicación.</p>
                </div>
            </div>
        </div>
    );
};

export default SchemaSetup;