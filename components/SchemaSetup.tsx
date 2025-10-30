import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, RefreshCw, Loader2, AlertTriangle, ScrollText } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const SQL_SCRIPT = `-- B.M. Contigo - Script de Inicialización de Base de Datos para Supabase
-- Versión 1.0.0
-- Este script creará las tablas necesarias, activará la seguridad a nivel de fila (RLS),
-- definirá las políticas de acceso y creará una función para manejar la aprobación de préstamos.

-- 1. CREACIÓN DE TABLAS

-- Tabla para almacenar información de los clientes
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla para almacenar las solicitudes de préstamo
CREATE TABLE requests (
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
CREATE TABLE loans (
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

-- 2. CONFIGURACIÓN DE ALMACENAMIENTO (Storage)
-- Se asume que el bucket 'documents' se crea manualmente desde el dashboard de Supabase.
-- Estas políticas permiten a los usuarios anónimos (público) subir a 'documents' y a los usuarios autenticados gestionar sus propios archivos.

-- Política para que CUALQUIERA (anon) pueda subir archivos a la carpeta 'documents'.
-- Esto es necesario para que el formulario de solicitud público funcione.
CREATE POLICY "Public Upload Access" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documents');

-- Política para que los usuarios autenticados (admins) puedan ver sus propios archivos.
CREATE POLICY "Allow Authenticated Select" ON storage.objects FOR SELECT TO authenticated USING (auth.role() = 'authenticated');

-- Política para que los usuarios autenticados (admins) puedan actualizar sus propios archivos.
CREATE POLICY "Allow Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (auth.role() = 'authenticated');

-- Política para que los usuarios autenticados (admins) puedan eliminar sus propios archivos.
CREATE POLICY "Allow Authenticated Delete" ON storage.objects FOR DELETE TO authenticated USING (auth.role() = 'authenticated');


-- 3. HABILITACIÓN DE SEGURIDAD A NIVEL DE FILA (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE ACCESO (RLS Policies)

-- Policies para la tabla 'clients'
-- Los usuarios autenticados (admins) pueden realizar todas las operaciones.
CREATE POLICY "Allow admin full access on clients" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para la tabla 'loans'
-- Los usuarios autenticados (admins) pueden realizar todas las operaciones.
CREATE POLICY "Allow admin full access on loans" ON loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies para la tabla 'requests'
-- CUALQUIERA (anon) puede crear una nueva solicitud.
CREATE POLICY "Allow public insert on requests" ON requests FOR INSERT TO public WITH CHECK (true);
-- Los usuarios autenticados (admins) pueden ver, actualizar y eliminar solicitudes.
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
    const { verifyDatabaseSchema, supabaseConfig } = useAppContext();
    const [isChecking, setIsChecking] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleRecheck = async () => {
        setIsChecking(true);
        await verifyDatabaseSchema();
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
         <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 font-sans">
            <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-gray-800 dark:text-gray-100">
                <div className="text-center mb-6">
                    <Database className="text-blue-500 h-16 w-16 mx-auto" />
                    <h1 className="text-3xl font-bold mt-4">Configuración de la Base de Datos</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        ¡Conexión exitosa! Ahora solo falta un paso: preparar tu base de datos.
                    </p>
                </div>
                 <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-800 dark:text-amber-200 text-sm flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                         <p className="font-bold">Acción Requerida</p>
                         <p>La aplicación no encontró las tablas necesarias en tu base de datos de Supabase. Por favor, ejecuta el siguiente script SQL para crearlas.</p>
                    </div>
                </div>

                <div className="mt-6">
                     <h2 className="text-xl font-semibold mb-2 flex items-center"><ScrollText className="mr-2"/>Script de Inicialización SQL</h2>
                     <div className="relative">
                        <textarea
                            readOnly
                            value={SQL_SCRIPT}
                            rows={10}
                            className="w-full p-3 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300"
                        />
                         <button onClick={handleCopy} className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                            {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                         </button>
                     </div>
                </div>

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
                        {isChecking ? 'Verificando...' : 'He ejecutado el script, verificar de nuevo'}
                    </button>
                </div>
                 <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                    <p>Una vez que ejecutes el script en tu editor de Supabase, haz clic en "Verificar de nuevo" para acceder a la aplicación.</p>
                </div>
            </div>
        </div>
    );
};

export default SchemaSetup;