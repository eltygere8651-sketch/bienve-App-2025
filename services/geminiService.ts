import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API key for Gemini is not set. Financial tips will not be available.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getFinancialTip = async (): Promise<string> => {
    if (!API_KEY) {
        return "La función de consejos financieros no está disponible. Configure la clave API de Gemini.";
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Genera un consejo financiero corto y útil en español, ideal para alguien que está gestionando pequeños préstamos entre amigos o familiares. El consejo debe ser positivo y fácil de entender.",
        });
        return response.text;
    } catch (error) {
        console.error("Error fetching financial tip from Gemini:", error);
        return "No se pudo obtener un consejo financiero en este momento. Inténtalo de nuevo más tarde.";
    }
};

export const generateWelcomeMessage = async (clientName: string): Promise<string> => {
    if (!API_KEY) {
        return `¡Bienvenido/a a bordo, ${clientName}! Estamos muy contentos de tenerte con nosotros.`;
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Genera un mensaje de bienvenida corto, cálido y profesional en español para un nuevo cliente de un servicio de préstamos llamado "B.M Contigo". El nombre del cliente es ${clientName}. El tono debe ser de confianza y positivo.`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating welcome message:", error);
        return `¡Bienvenido/a, ${clientName}! Estamos felices de que te unas a la comunidad B.M Contigo.`;
    }
};