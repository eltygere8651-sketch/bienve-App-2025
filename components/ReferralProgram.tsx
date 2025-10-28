import React, { useState, useEffect } from 'react';
import { Gift, UserPlus, Copy, Check, Award } from 'lucide-react';

const ReferralProgram: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const [referrerName, setReferrerName] = useState('');
    const [referralLink, setReferralLink] = useState('');

    useEffect(() => {
        const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
        if (referrerName.trim() !== '') {
            setReferralLink(`${baseUrl}?ref=${encodeURIComponent(referrerName.trim())}`);
        } else {
            setReferralLink('');
        }
    }, [referrerName]);

    const handleCopy = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-12">
                <Gift size={48} className="mx-auto text-blue-500 dark:text-blue-400" />
                <h1 className="mt-4 text-4xl font-extrabold text-gray-800 dark:text-gray-100">
                    Recomienda y Gana
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                    ¡Compartir tiene premio! Es muy fácil.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg space-y-8">
                <div>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full h-10 w-10 flex items-center justify-center font-bold text-lg">
                            1
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Escribe tu nombre
                        </h3>
                    </div>
                    <input
                        id="referrerName"
                        type="text"
                        value={referrerName}
                        onChange={(e) => setReferrerName(e.target.value)}
                        placeholder="Tu nombre completo aquí"
                        className="mt-4 w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg"
                    />
                </div>

                <div className={`transition-opacity duration-500 ${referrerName.trim() ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full h-10 w-10 flex items-center justify-center font-bold text-lg">
                            2
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                            Copia tu enlace mágico
                        </h3>
                    </div>
                    <div className="mt-4 flex w-full rounded-lg shadow-sm">
                        <input
                            type="text"
                            readOnly
                            value={referralLink}
                            placeholder="Tu enlace aparecerá aquí"
                            className="flex-1 block w-full rounded-none rounded-l-lg px-4 py-3 border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 focus:outline-none text-lg"
                        />
                        <button
                            onClick={handleCopy}
                            className={`inline-flex items-center justify-center px-6 py-3 border rounded-r-lg font-bold text-lg transition-colors ${
                                copied
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {copied ? <Check size={24} /> : <Copy size={24} />}
                            <span className="ml-2">{copied ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-12 grid md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center">
                    <UserPlus size={40} className="mx-auto text-green-500 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        Tu Amigo Gana
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                        La oportunidad de conseguir un préstamo de confianza.
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center">
                    <Award size={40} className="mx-auto text-blue-500 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        Tú Ganas
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                        Un <span className="font-extrabold text-blue-600 dark:text-blue-400">2% de descuento</span> en los intereses de tu próximo pago.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReferralProgram;