
import React, { useState } from 'react';
import { Share2, QrCode, MessageCircle, Copy, X, Check, ExternalLink } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface ShareAppProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShareApp: React.FC<ShareAppProps> = ({ isOpen, onClose }) => {
  const { showToast } = useAppContext();
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const appUrl = window.location.origin;
  const shareMessage = encodeURIComponent(`¡Hola! Te recomiendo B.M Contigo para gestionar préstamos de confianza entre amigos y conocidos. Puedes solicitar el tuyo de forma segura aquí: ${appUrl}`);
  const whatsappUrl = `https://wa.me/?text=${shareMessage}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&color=f59e0b&bgcolor=1e293b`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    showToast('Enlace copiado al portapapeles', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'B.M Contigo',
          text: 'Gestiona tus préstamos de confianza de forma sencilla.',
          url: appUrl,
        });
      } catch (err) {
        console.log('Error compartiendo:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-modal-backdrop" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-700 animate-modal-content" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Share2 size={18} className="text-primary-400" />
            Compartir App
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 text-center">
          {/* QR Section */}
          <div className="bg-slate-900 p-4 rounded-xl inline-block border border-slate-700 shadow-inner">
            <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
            <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-widest">Escanea para abrir</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-400">Invita a tus conocidos a usar B.M Contigo</p>
            
            <div className="grid grid-cols-1 gap-3">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all transform active:scale-95 shadow-lg shadow-green-900/20"
              >
                <MessageCircle size={20} />
                Compartir por WhatsApp
              </a>

              <button 
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded-xl border border-slate-600 transition-all transform active:scale-95"
              >
                {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                {copied ? '¡Copiado!' : 'Copiar Enlace'}
              </button>

              {navigator.share && (
                <button 
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all transform active:scale-95 shadow-lg shadow-primary-900/20"
                >
                  <ExternalLink size={20} />
                  Otras opciones
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 p-4 text-center border-t border-slate-700">
          <p className="text-xs text-slate-500 italic">"Apoyándonos crecemos todos"</p>
        </div>
      </div>
    </div>
  );
};

export default ShareApp;
