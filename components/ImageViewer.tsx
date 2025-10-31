import React, { useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';

interface ImageViewerProps {
    imageUrl: string;
    alt: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, alt }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const placeholder = (icon: React.ReactNode, text: string) => (
        <div className="rounded-lg w-full h-32 bg-gray-200 flex flex-col items-center justify-center text-xs text-gray-500">
            {icon}
            <span className="mt-2">{text}</span>
        </div>
    );

    if (!imageUrl) {
        return placeholder(<ImageOff size={24} />, "Sin Imagen");
    }
    
    return (
        <>
            {(isLoading || hasError) && (
                <div className="w-full">
                    {hasError 
                        ? placeholder(<ImageOff size={24} />, "Error al cargar")
                        : placeholder(<Loader2 size={24} className="animate-spin" />, "Cargando...")
                    }
                </div>
            )}
            <img 
                src={imageUrl} 
                alt={alt} 
                className="rounded-lg w-full h-auto object-cover"
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setHasError(true); }}
                style={{ display: isLoading || hasError ? 'none' : 'block' }}
            />
        </>
    );
};

export default ImageViewer;