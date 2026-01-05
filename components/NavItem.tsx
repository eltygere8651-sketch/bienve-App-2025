
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
                className={`w-full flex items-center justify-between p-3 my-1.5 rounded-xl cursor-pointer transition-all duration-200 text-left group border border-transparent outline-none focus:ring-2 focus:ring-primary-500/50 ${
                    isActive && !isTestButton
                        ? 'bg-primary-600/10 text-primary-300 border-primary-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                        : isTestButton 
                        ? 'text-amber-400 hover:bg-amber-500/10 hover:text-amber-300' 
                        :'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
                title={label}
            >
                <div className="flex items-center flex-1 min-w-0"> 
                    <span className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {React.cloneElement(icon as React.ReactElement, { size: 22 })} 
                    </span>
                    
                    {/* Allow wrapping by removing whitespace-nowrap when open. Added leading-tight for multi-line aesthetics. */}
                    <span 
                        className={`ml-3 font-medium text-sm transition-all duration-300 origin-left leading-tight
                        ${isSidebarOpen 
                            ? 'opacity-100 w-auto translate-x-0' 
                            : 'opacity-0 w-0 -translate-x-4 overflow-hidden absolute whitespace-nowrap' 
                        }`}
                    >
                        {label}
                    </span>
                </div>
                
                {isSidebarOpen && badge != null && badge > 0 && (
                    <span className={`ml-2 text-[10px] font-bold rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center transition-colors shadow-sm flex-shrink-0 ${isActive ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {badge}
                    </span>
                )}
            </button>
        </li>
    );
};

export default NavItem;
