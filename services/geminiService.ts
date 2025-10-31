

import { GoogleGenAI } from "@google/genai";

// --- INICIO DE LA CONFIGURACIÓN DE DESPLIEGUE (¡ADVERTENCIA DE SEGURIDAD!) ---
// IMPORTANTE: Exponer tu clave API de Gemini en el código del cliente es un RIESGO DE SEGURIDAD.
// Cualquiera que visite tu web puede verla y usarla, lo que podría generar costos en tu cuenta.
// Esta solución es un parche para que la funcionalidad se active en un entorno de despliegue simple.
// Para un proyecto en producción, se recomienda usar una función en la nube (Edge Function de Supabase)
// que actúe como intermediario para llamar a la API de Gemini de forma segura.
const DEPLOYED_GEMINI_API_KEY = 'REPLACE_WITH_YOUR_GEMINI_API_KEY';
// --- FIN DE LA CONFIGURACIÓN DE DESPLIEGUE ---

let ai: GoogleGenAI | null = null;
let hasWarnedMissingApiKey = false;

const isPlaceholder = (value: string) => value.startsWith('REPLACE_WITH');

/**
 * Inicializa y devuelve el cliente de GoogleGenAI de forma diferida.
 * Devuelve null si la clave API no está configurada, evitando bloqueos.
 */
const getAiClient = (): GoogleGenAI | null => {
    if (ai) {
        return ai;
    }

    let apiKey: string | undefined = undefined;

    // Prioridad 1: Clave incrustada para el despliegue público (menos seguro).
    if (!isPlaceholder(DEPLOYED_GEMINI_API_KEY)) {
        apiKey = DEPLOYED_GEMINI_API_KEY;
    }
    // Prioridad 2: Variable de entorno (ideal para entornos de desarrollo seguros).
    else if (process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    }

    if (apiKey) {
        ai = new GoogleGenAI({ apiKey });
        return ai;
    } else {
        if (hasWarnedMissingApiKey) return null;
        console.warn("La clave API de Gemini no está configurada. Las funciones de IA estarán desactivadas.");
        hasWarnedMissingApiKey = true;
        return null;
    }
};


export const getFinancialTip = async (): Promise<string> => {
    const client = getAiClient();
    if (!client) {
        return "La clave API de Gemini no está configurada. El consejo financiero está desactivado.";
    }

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Genera un consejo financiero corto y útil en español, ideal para alguien que está gestionando pequeños préstamos entre amigos o familiares. El consejo debe ser positivo y fácil de entender.",
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching financial tip from Gemini:", error);
        return "No se pudo obtener un consejo financiero en este momento. Inténtalo de nuevo más tarde.";
    }
};

export const getRandomFact = async (): Promise<string> => {
    const client = getAiClient();
    if (!client) {
        return "La clave API de Gemini no está configurada. Los datos curiosos están desactivados.";
    }

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Genera un dato interesante y corto en español. Puede ser de cultura general, una noticia de actualidad positiva (no política ni controversial), o un 'sabías que'. El tono debe ser de descubrimiento y fácil de entender.",
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching random fact from Gemini:", error);
        return "¿Sabías que la Torre Eiffel puede ser 15 cm más alta durante el verano debido a la expansión térmica del hierro?";
    }
};

export const generateWelcomeMessage = async (clientName: string): Promise<string> => {
    const client = getAiClient();
    if (!client) {
        // Devuelve un mensaje de bienvenida estándar, no generado por IA, como alternativa.
        return `¡Bienvenido/a, ${clientName}! Estamos felices de que te unas a la comunidad B.M Contigo.`;
    }

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Genera un mensaje de bienvenida corto, cálido y profesional en español para un nuevo cliente de un servicio de préstamos llamado "B.M Contigo". El nombre del cliente es ${clientName}. El tono debe ser de confianza y positivo.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating welcome message:", error);
        return `¡Bienvenido/a, ${clientName}! Estamos felices de que te unas a la comunidad B.M Contigo.`;
    }
};