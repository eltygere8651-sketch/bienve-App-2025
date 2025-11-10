
import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import NavItem from './NavItem';
import InstallPWAInstructions from './InstallPWAInstructions';
import { useAppContext } from '../contexts/AppContext';

const InstallNavItem: React.FC<{ isSidebarOpen: boolean }> = ({ isSidebarOpen }) => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showIosInstall, setShowIosInstall] = useState(false);
    const { showToast } = useAppContext();

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = () => {
        // Case 1: The deferred prompt is ready. Use it.
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                // We can't use the prompt again, so clear it
                setInstallPrompt(null);
            });
        // Case 2: The user is on iOS. Show manual instructions.
        } else if (isIos) {
            setShowIosInstall(true);
        // Case 3: The browser is compatible (like Chrome/Edge), but the prompt isn't ready.
        // This can happen if the PWA criteria aren't met yet or the user dismissed it before.
        // We provide a helpful hint instead of an error.
        } else if ('onbeforeinstallprompt' in window || navigator.serviceWorker) {
             showToast('La instalación está disponible. Búscala en el menú de tu navegador.', 'info');
        // Case 4: The browser is genuinely not supported.
        } else {
            showToast('La instalación no es soportada en este navegador.', 'info');
        }
    };

    // Don't show the button if the app is already installed
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
            {showIosInstall && <InstallPWAInstructions onClose={() => setShowIosInstall(false)} />}
        </>
    );
};

export default InstallNavItem;