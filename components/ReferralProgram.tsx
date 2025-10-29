import React, { useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const ReferralProgram: React.FC = () => {
    const { showToast } = useAppContext();
    // In a real app, this code would be uniquely generated and fetched for the user.
    const referralCode = "BMCONTIGO-1A2B3C";
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode).then(() => {
            setCopied(true);
            showToast('¡Código copiado!', 'success');
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            showToast('No se pudo copiar el código.', 'error');
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center">
                <Gift className="h-8 w-8 mr-3 text-pink-500" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Programa de Referidos</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Invita a un Amigo y Gana</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Comparte tu código de referido. Cuando un amigo lo use en su primera solicitud aprobada, ¡ambos recibiréis una recompensa!
                </p>

                <p className="text-sm text-gray-500 dark:text-gray-400">Tu código de referido único:</p>
                <div className="my-2 flex justify-center">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                        <span className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400 mr-4 tracking-widest">{referralCode}</span>
                        <button
                            onClick={handleCopy}
                            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                            aria-label="Copiar código"
                        >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 dark:bg-green-900/50 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">Beneficio para Ti</h3>
                    <p className="text-green-700 dark:text-green-300">
                        Por cada referido exitoso, recibirás <strong>50 puntos de lealtad extra</strong>, ¡acelerando tu camino hacia el siguiente nivel y mejores beneficios!
                    </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/50 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">Beneficio para tu Amigo</h3>
                    <p className="text-purple-700 dark:text-purple-300">
                        Tu amigo recibirá una <strong>revisión prioritaria</strong> de su primera solicitud de préstamo, además de un bono de bienvenida de <strong>10 puntos de lealtad</strong>.
                    </p>
                </div>
            </div>
             <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                *Los beneficios y condiciones del programa de referidos están sujetos a cambios. La recompensa se aplica únicamente tras la aprobación y primer pago del préstamo del referido.
            </p>
        </div>
    );
};

export default ReferralProgram;
