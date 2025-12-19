
import React, { useRef } from 'react';
import { UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';

export const InputField: React.FC<{
    label: string;
    name: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    isOptional?: boolean;
    min?: string | number;
}> = ({ label, name, type, value, onChange, required, isOptional, min }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">
            {label} {isOptional && <span className="text-xs text-slate-400">(Opcional)</span>}
        </label>
        <input 
            id={name} name={name} type={type} value={value} onChange={onChange} 
            required={required} min={min} 
            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100" 
        />
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
            className="w-full px-3 py-2 border border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-slate-700 text-slate-100"
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
