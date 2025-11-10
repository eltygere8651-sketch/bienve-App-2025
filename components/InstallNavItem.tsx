
import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import NavItem from './NavItem';
import InstallPWAInstructions from './InstallPWAInstructions';
import { useAppContext } from '../contexts/AppContext';

const InstallNavItem: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showInstructions, setShowInstructions] = useState(false);
    const { showToast } = useAppContext();

    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = () => {
        // Si el prompt de instalación nativo está disponible, úsalo.
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    showToast('¡Aplicación instalada con éxito!', 'success');
                } else {
                    showToast('Instalación cancelada.', 'info');
                }
                setInstallPrompt(null);
            });
        } else {
            // Si no hay prompt, muestra el modal con instrucciones manuales.
            setShowInstructions(true);
        }
    };

    // No mostrar el botón si la aplicación ya está instalada.
    if (isInStandaloneMode) {
        return null;
    }

    return (
        <>
            <NavItem
                icon={<Download />}
                label="Instalar Aplicación"
                onClick={handleInstallClick}
                isSidebarOpen={isSidebarOpen}
            />
            <InstallPWAInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />
        </>
    );
};

export default InstallNavItem;