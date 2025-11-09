import React from 'react';
import { UploadCloud } from 'lucide-react';

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
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
            {label} {isOptional && <span className="text-xs text-slate-500">(Opcional)</span>}
        </label>
        <input 
            id={name} name={name} type={type} value={value} onChange={onChange} 
            required={required} min={min} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-900" 
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
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <select 
            id={name} name={name} value={value} onChange={onChange} required={required} 
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white text-slate-900"
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
}> = ({ label, id, onChange, previewUrl, fileName }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
                 {previewUrl ? <img src={previewUrl} alt="Preview" className="mx-auto h-24 w-auto rounded-md" /> : <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />}
                <div className="flex text-sm text-slate-600">
                    <label htmlFor={id} className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500"><span>{fileName ? 'Cambiar archivo' : 'Sube un archivo'}</span><input id={id} name={id} type="file" className="sr-only" onChange={onChange} accept="image/*" /></label>
                    <p className="pl-1">{fileName ? '' : 'o arrastra y suelta'}</p>
                </div>
                 <p className="text-xs text-slate-500">{fileName || 'PNG, JPG, GIF hasta 10MB'}</p>
            </div>
        </div>
    </div>
);