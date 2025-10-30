
import { GoogleGenAI } from "@google/genai";

// Instancia inicializada de forma diferida para evitar que la aplicación se bloquee si la clave API falta al cargar.
let ai: GoogleGenAI | null = null;
let hasWarnedMissingApiKey = false;

/**
 * Inicializa y devuelve el cliente de GoogleGenAI de forma diferida.
 * Devuelve null si la clave API no está configurada, evitando bloqueos.
 */
const getAiClient = (): GoogleGenAI | null => {
    if (ai) {
        return ai;
    }

    if (process.env.API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        return ai;
    } else {
        // Este aviso se registrará solo una vez.
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