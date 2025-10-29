import React from 'react';
import { Star, Award } from 'lucide-react';
import { LOYALTY_TIERS } from '../constants';
import { LoyaltyStatus } from '../types';

const LoyaltyProgramInfo: React.FC = () => {
    const tiers = [
        LOYALTY_TIERS[LoyaltyStatus.BRONZE],
        LOYALTY_TIERS[LoyaltyStatus.SILVER],
        LOYALTY_TIERS[LoyaltyStatus.GOLD]
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center">
                <Star className="h-8 w-8 mr-3 text-amber-500" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Programa de Lealtad</h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Recompensamos tu Confianza</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Nuestro programa de lealtad está diseñado para agradecerte por ser un cliente responsable. Acumula puntos con cada pago a tiempo y accede a mejores beneficios.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tiers.map((tier) => (
                        <div key={tier.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center flex flex-col">
                            <div className="mb-4">
                                {tier.name === LoyaltyStatus.GOLD ? (
                                    <Star className="h-10 w-10 mx-auto text-amber-500" fill="currentColor" />
                                ) : (
                                    <Award className={`h-10 w-10 mx-auto ${tier.name === LoyaltyStatus.SILVER ? 'text-gray-400' : 'text-orange-400'}`} fill="currentColor"/>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{tier.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{tier.pointsRequired} Puntos Mínimo</p>
                            
                            <div className="flex-grow">
                                <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <li className="flex items-center">
                                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                        <span>Reducción de interés del <strong>{Math.abs(tier.interestRateModifier) * 100}%</strong></span>
                                    </li>
                                     <li className="flex items-center">
                                        <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                        <span>Prioridad en nuevas solicitudes</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/50 p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">¿Cómo funciona?</h3>
                <ul className="list-disc list-inside space-y-2 text-blue-700 dark:text-blue-300">
                    <li>Ganas <strong>10 puntos</strong> por cada pago de cuota realizado a tiempo.</li>
                    <li>Los puntos se acumulan y tu nivel se actualiza automáticamente.</li>
                    <li>Los beneficios de tu nivel se aplicarán en tus futuras solicitudes de préstamo.</li>
                    <li>Los pagos atrasados no suman puntos.</li>
                </ul>
            </div>
        </div>
    );
};

export default LoyaltyProgramInfo;
