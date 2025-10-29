
import { GoogleGenAI, Type } from "@google/genai";
import { LoanRequest } from '../types';

// Fix: Per coding guidelines, API_KEY is assumed to be available in process.env and should be used directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFinancialTip = async (): Promise<string> => {
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

export const getRandomFact = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
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

export const verifyLoanRequestData = async (
    data: Omit<LoanRequest, 'id' | 'requestDate' | 'status' | 'frontIdUrl' | 'backIdUrl'>
): Promise<{ isValid: boolean; reason: string }> => {
    const prompt = `
        Analiza los siguientes datos de una solicitud de préstamo como si fueras un analista de riesgos.
        Tu objetivo es detectar información que parezca obviamente falsa, inventada o de prueba.
        No seas demasiado estricto, solo busca señales de alerta claras.
        Datos de la solicitud:
        - Nombre Completo: ${data.fullName}
        - DNI / NIE: ${data.idNumber}
        - Dirección: ${data.address}
        - Monto Solicitado: ${data.loanAmount}
        - Motivo del Préstamo: ${data.loanReason}
        - Situación Laboral: ${data.employmentStatus}

        Busca inconsistencias como:
        - Nombres que parecen de prueba (ej: "Test", "Prueba").
        - Direcciones que parecen falsas (ej: "Calle Falsa 123", "Nowhere").
        - Formatos de DNI/NIE que no son lógicos para España.
        - Montos muy altos para motivos triviales (ej: 50,000€ para "Otro").

        Responde únicamente en formato JSON con la siguiente estructura:
        {
            "isValid": boolean,
            "reason": "string con una explicación CORTA y amable si no es válido, o 'OK' si es válido."
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING },
                    },
                    required: ['isValid', 'reason'],
                },
            }
        });
        
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse;

    } catch (error) {
        console.error("Error verifying loan request data with Gemini:", error);
        // In case of error, default to valid to avoid blocking the user.
        return { isValid: true, reason: 'Error durante la verificación de IA.' };
    }
};
