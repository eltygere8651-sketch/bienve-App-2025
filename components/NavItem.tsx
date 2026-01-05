
import React from 'react';
import { AppView } from '../types';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    view?: AppView;
    onClick: (view?: AppView) => void;
    currentView?: AppView;
    isSidebarOpen: boolean;
    badge?: number;
    isTestButton?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, currentView, onClick, isSidebarOpen, badge, isTestButton }) => {
    const isActive = currentView === view;

    return (
        <li>
            <button
                onClick={() => onClick(view)}
                className={`w-full flex items-center justify-between p-3 my-1 rounded-xl cursor-pointer transition-all duration-200 text-left group border border-transparent ${
                    isActive && !isTestButton
                        ? 'bg-primary-500/10 text-primary-300 border-primary-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                        : isTestButton 
                        ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300' 
                        :'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
                title={label}
            >
                <div className="flex items-center min-w-0 flex-1">
                    <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {React.cloneElement(icon as React.ReactElement, { size: 20 })}
                    </span>
                    <span className={`ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                        {label}
                    </span>
                </div>
                {isSidebarOpen && badge != null && badge > 0 && (
                    <span className={`ml-2 text-[10px] font-bold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center transition-colors flex-shrink-0 ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {badge}
                    </span>
                )}
            </button>
        </li>
    );
};

export default NavItem;
