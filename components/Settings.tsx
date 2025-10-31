import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { DEFAULT_CONTRACT_TEMPLATE } from '../services/pdfService';
import { LOCAL_STORAGE_KEYS } from '../constants';

const Settings: React.FC = () => {
    const { showToast } = useAppContext();
    const [template, setTemplate] = useState('');

    useEffect(() => {
        const savedTemplate = localStorage.getItem(LOCAL_STORAGE_KEYS.CONTRACT_TEMPLATE);
        setTemplate(savedTemplate || DEFAULT_CONTRACT_TEMPLATE);
    }, []);

    const handleSave = () => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.CONTRACT_TEMPLATE, template);
        showToast('Plantilla de contrato guardada.', 'success');
    };

    const handleReset = () => {
        setTemplate(DEFAULT_CONTRACT_TEMPLATE);
        showToast('Plantilla restaurada a la versión por defecto.', 'info');
    };

    const placeholders = [
        { key: '${fullName}', desc: 'Nombre completo del prestatario' },
        { key: '${idNumber}', desc: 'DNI/NIE del prestatario' },
        { key: '${address}', desc: 'Dirección del prestatario' },
        { key: '${loanAmount}', desc: 'Monto del préstamo' },
        { key: '${today}', desc: 'Fecha de generación del contrato' },
        { key: '${interestRate}', desc: 'Tasa de interés mensual' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <SettingsIcon className="h-8 w-8 mr-3 text-blue-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ajustes</h1>
            </div>

            <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Plantilla de Contrato de Préstamo</h2>
                <p className="text-gray-600 mb-4">
                    Modifica el texto del contrato que se genera para cada nueva solicitud. Utiliza los placeholders disponibles para insertar datos dinámicamente.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <textarea
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            rows={20}
                            className="w-full p-3 font-mono text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                            placeholder="Escribe aquí tu plantilla de contrato..."
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Placeholders Disponibles</h3>
                        <div className="space-y-2">
                            {placeholders.map(p => (
                                <div key={p.key} className="p-2 bg-gray-100 rounded-md">
                                    <p className="font-mono text-sm text-blue-600">{p.key}</p>
                                    <p className="text-xs text-gray-500">{p.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        <RotateCcw size={18} className="mr-2" />
                        Restaurar por Defecto
                    </button>
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-transform hover:scale-105"
                    >
                        <Save size={18} className="mr-2" />
                        Guardar Plantilla
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
