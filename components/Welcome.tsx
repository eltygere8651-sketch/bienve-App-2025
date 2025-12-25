
import React from 'react';
import { PenSquare, Handshake, FileText, PenTool, Banknote, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const LargeLogo = () => (
    <div className="flex items-center justify-center mb-8">
        <div className="relative group cursor-default">
            <div className="absolute inset-0 bg-primary-500 blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-1000 rounded-full"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-full w-40 h-40 flex items-center justify-center shadow-2xl border border-white/10 ring-4 ring-white/5 animate-pulse-slow">
                <Handshake className="text-primary-400 w-20 h-20" strokeWidth={1.5} />
            </div>
        </div>
    </div>
);

const StepCard: React.FC<{ icon: React.ReactNode, title: string, desc: string, delay: string }> = ({ icon, title, desc, delay }) => (
    <div className={`glass-card p-8 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-2 hover:bg-slate-800/80 ${delay}`}>
        <div className="bg-slate-800/80 p-4 rounded-2xl text-primary-400 mb-5 shadow-lg border border-white/5 ring-1 ring-white/5">
            {icon}
        </div>
        <h3 className="font-heading font-bold text-lg text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
);

const Welcome: React.FC = () => {
    const { setCurrentView } = useAppContext();
    
    return (
        <div className="space-y-16 animate-fade-in-down pb-8 max-w-5xl mx-auto">
            
            {/* Hero Section */}
            <div className="text-center pt-8 sm:pt-16">
                <LargeLogo />
                
                <h1 className="text-5xl sm:text-6xl font-heading font-extrabold text-white tracking-tight leading-tight mb-6">
                    Tus ideas, <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">nuestro impulso.</span>
                </h1>
                
                <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
                    Plataforma segura de préstamos entre conocidos. Rápido, transparente y sin letra pequeña.
                </p>

                <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-primary-500/20 px-5 py-2 rounded-full text-primary-200 text-sm font-medium backdrop-blur-sm mb-10">
                    <ShieldCheck size={18} className="text-primary-400"/>
                    <span>Aprobación basada en confianza y análisis personalizado</span>
                </div>

                <div className="flex justify-center items-center">
                    <button 
                        onClick={() => setCurrentView('loanRequest')}
                        className="group relative inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white text-lg font-bold rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:bg-primary-500 hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] focus:outline-none focus:ring-4 focus:ring-primary-500/30 transition-all duration-300 hover:scale-105"
                     >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                        <PenSquare size={22} className="mr-3" />
                        Iniciar Solicitud
                     </button>
                 </div>
            </div>

            {/* Steps Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
                <StepCard 
                    icon={<FileText size={28} />} 
                    title="1. Rellena tus datos" 
                    desc="Completa el formulario y sube una foto de tu documento de identidad de forma segura."
                    delay="delay-0"
                />
                <StepCard 
                    icon={<PenTool size={28} />} 
                    title="2. Firma Digital" 
                    desc="Lee y acepta el contrato de préstamo firmando directamente en tu pantalla."
                    delay="delay-100"
                />
                <StepCard 
                    icon={<Banknote size={28} />} 
                    title="3. Recibe el Dinero" 
                    desc="Tras una rápida revisión por parte de la administración, recibirás el dinero."
                    delay="delay-200"
                />
            </div>
            
            <div className="text-center pt-8 border-t border-white/5">
                <p className="text-slate-500 text-sm">© {new Date().getFullYear()} B.M Contigo. Finanzas personales simplificadas.</p>
            </div>
        </div>
    );
};

export default Welcome;
