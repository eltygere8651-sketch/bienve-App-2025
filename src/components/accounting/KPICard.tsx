
import React from 'react';
import { motion } from 'motion/react';

interface KPICardProps {
    title: string;
    value: string;
    subtext?: string;
    icon: any;
    color: string;
    isRisk?: boolean;
    index?: number;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtext, icon: Icon, color, isRisk, index = 0 }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-slate-800/60 border ${isRisk ? 'border-red-500/30 bg-red-900/10' : 'border-slate-700'} p-6 rounded-2xl flex flex-col justify-between backdrop-blur-md relative overflow-hidden group hover:-translate-y-1 transition-transform`}
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500 text-${color}-400`}>
            <Icon size={64} />
        </div>
        <div>
            <div className={`flex items-center gap-2 text-${color}-400 mb-2`}>
                <Icon size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
            </div>
            <h3 className="text-3xl font-heading font-bold text-white mb-1 tracking-tight">{value}</h3>
            {subtext && <p className="text-xs text-slate-400 font-medium">{subtext}</p>}
        </div>
    </motion.div>
);

export default KPICard;
