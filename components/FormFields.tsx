
import React, { useRef } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, Euro } from 'lucide-react';

// Helper for mobile UX: Scroll element into center view when focused (avoid keyboard overlap)
const handleFocusAndScroll = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    // 1. Select text for easy editing
    e.target.select(); 
    
    // 2. Wait for keyboard to slide up (300ms is standard animation time), then scroll
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
};

export const InputField: React.FC<{
    label: string;
    name: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    isOptional?: boolean;
    min?: string | number;
    step?: string | number;
    placeholder?: string;
}> = ({ label, name, type, value, onChange, required, isOptional, min, step, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
            {label} {isOptional && <span className="text-xs text-slate-400">(Opcional)</span>}
        </label>
        <input 
            id={name} 
            name={name} 
            type={type} 
            value={value} 
            onChange={onChange} 
            required={required} 
            min={min} 
            step={step}
            placeholder={placeholder}
            onFocus={handleFocusAndScroll}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100 placeholder-slate-500 transition-all" 
        />
    </div>
);

export const MoneyInput: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
    required?: boolean;
    autoFocus?: boolean;
}> = ({ label, value, onChange, required, autoFocus }) => (
    <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Euro size={18} className="text-slate-500 group-focus-within:text-primary-400 transition-colors" />
            </div>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                min="0.01"
                step="0.01"
                placeholder="0.00"
                autoFocus={autoFocus}
                onFocus={handleFocusAndScroll}
                className="block w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-600 rounded-xl leading-5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-lg font-bold transition-all shadow-inner"
            />
        </div>
    </div>
);

export const SelectField: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    required?: boolean;
    children: React.ReactNode;
}> = ({ label, name, value, onChange, required, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <select 
            id={name} name={name} value={value} onChange={onChange} required={required} 
            onFocus={(e) => {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }}
            className="w-full px-3 py-2 border border-slate-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100 transition-all appearance-none"
        >
            {children}
        </select>
    </div>
);

export const FileUploadField: React.FC<{
    label: string;
    id: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    previewUrl: string | null;
    fileName: string | undefined;
}> = ({ label, id, onChange, previewUrl, fileName }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const handleGalleryClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col h-full">
            <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center p-4 border-2 border-slate-600 border-dashed rounded-xl bg-slate-800/40 hover:bg-slate-800/60 transition-all group">
                
                {previewUrl ? (
                    <div className="relative w-full aspect-[4/3] max-h-32 mb-4 overflow-hidden rounded-lg border border-slate-600 bg-slate-900 flex items-center justify-center">
                        <img src={previewUrl} alt="Vista previa del documento" className="max-w-full max-h-full object-contain" />
                    </div>
                ) : (
                    <div className="mb-4 p-3 rounded-full bg-slate-700/50 text-slate-400 group-hover:text-primary-400 group-hover:bg-primary-500/10 transition-all">
                        <UploadCloud size={32} />
                    </div>
                )}

                <div className="w-full grid grid-cols-2 gap-2">
                    {/* Botón Cámara */}
                    <button
                        type="button"
                        onClick={handleCameraClick}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
                    >
                        <Camera size={18} />
                        <span className="text-[10px] font-bold uppercase">Tomar Foto</span>
                    </button>
                    
                    {/* Botón Galería */}
                    <button
                        type="button"
                        onClick={handleGalleryClick}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg bg-slate-700 text-slate-100 hover:bg-slate-600 transition-colors border border-slate-600"
                    >
                        <ImageIcon size={18} />
                        <span className="text-[10px] font-bold uppercase">Galería</span>
                    </button>
                </div>

                <p className="mt-3 text-[10px] text-slate-500 font-medium text-center truncate w-full">
                    {fileName || 'PNG, JPG hasta 10MB'}
                </p>

                {/* Inputs ocultos */}
                <input
                    ref={fileInputRef}
                    id={id}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onChange}
                />
                <input
                    ref={cameraInputRef}
                    id={`${id}-camera`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onChange}
                />
            </div>
        </div>
    );
};
