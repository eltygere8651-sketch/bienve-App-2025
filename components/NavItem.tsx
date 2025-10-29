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

const NavItem: React.FC<NavItemProps> = ({ icon, label, view, currentView, onClick, isSidebarOpen, badge, isTestButton }) => (
    <li>
        <button
            onClick={() => onClick(view)}
            className={`w-full flex items-center justify-between p-3 my-1 rounded-lg cursor-pointer transition-all duration-200 text-left ${
                currentView === view && !isTestButton
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isTestButton ? 'text-amber-300 hover:bg-amber-700/50 hover:text-amber-200' :'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
        >
            <div className="flex items-center">
                {icon}
                <span className={`ml-4 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 w-0'}`}>{label}</span>
            </div>
            {isSidebarOpen && badge && badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {badge}
                </span>
            )}
        </button>
    </li>
);

export default NavItem;