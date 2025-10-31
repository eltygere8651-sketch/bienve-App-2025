

import { GoogleGenAI } from "@google/genai";
import { LoanRequest } from '../types';
import { formatCurrency } from './utils';

// --- Configuración de la API de Gemini (¡IMPORTANTE!) ---
// Para que las funciones de IA funcionen en tu aplicación desplegada, debes configurar
// tu clave API de Gemini como una variable de entorno en tu plataforma de hosting (Vercel, Netlify, etc.).
// El nombre de la variable de entorno DEBE SER "API_KEY".
// NO PEGUES TU CLAVE API DIRECTAMENTE EN ESTE ARCHIVO.

let ai: GoogleGenAI | null = null;
let isInitialized = false;

/**
 * Inicializa y devuelve el cliente de GoogleGenAI de forma diferida.
 * Devuelve null si la clave API (process.env.API_KEY) no está configurada.
 */
const getAiClient = (): GoogleGenAI | null => {
    // Si ya intentamos inicializar, devolvemos la instancia (o null si falló).
    if (isInitialized) {
        return ai;
    }

    const apiKey = process.env.API_KEY;

    if (apiKey) {
        try {
            ai = new GoogleGenAI({ apiKey });
        } catch (error) {
            console.error("Error al inicializar el cliente de Gemini:", error);
            ai = null;
        }
    } else {
        console.warn("La variable de entorno API_KEY de Gemini no está configurada. Las funciones de IA estarán desactivadas.");
    }
    
    isInitialized = true;
    return ai;
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

export const generateRequestSummary = async (request: LoanRequest): Promise<string> => {
    const client = getAiClient();
    if (!client) {
        return "La clave API de Gemini no está configurada. El resumen de IA está desactivado.";
    }

    const prompt = `
        Analiza la siguiente solicitud de préstamo y proporciona un resumen conciso y profesional en español para un analista de crédito.
        Formatea la respuesta en Markdown, utilizando negritas y listas. No incluyas un título principal, empieza directamente con el resumen.

        **Datos de la Solicitud:**
        - **Solicitante:** ${request.fullName}
        - **Monto Solicitado:** ${formatCurrency(request.loanAmount)}
        - **Motivo:** ${request.loanReason}
        - **Situación Laboral:** ${request.employmentStatus} ${request.contractType ? `(${request.contractType})` : ''}

        **Tu Tarea:**
        1.  **Resumen General:** Escribe un párrafo breve sobre el perfil del solicitante y su petición.
        2.  **Puntos Positivos:** Crea una lista de 2-3 puntos clave que respalden la solicitud (ej. situación laboral estable, motivo de inversión).
        3.  **Posibles Riesgos a Considerar:** Crea una lista de 2-3 puntos que requieran atención o más investigación (ej. monto elevado, situación laboral precaria, motivo vago).
        4.  **Recomendación Final:** Concluye con una recomendación breve (ej. "Parece un candidato sólido", "Se recomienda cautela", "Requiere análisis adicional").
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating request summary from Gemini:", error);
        return "No se pudo generar el resumen en este momento. Inténtalo de nuevo más tarde.";
    }
};
