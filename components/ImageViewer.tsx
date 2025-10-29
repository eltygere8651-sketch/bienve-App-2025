import React from 'react';
import { ImageOff } from 'lucide-react';

interface ImageViewerProps {
    imageUrl: string;
    alt: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, alt }) => {
    if (!imageUrl) {
        return (
            <div className="rounded-lg w-full h-32 bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center text-xs text-gray-500">
                <ImageOff size={24} />
                <span className="mt-2">Sin Imagen</span>
            </div>
        );
    }

    return <img src={imageUrl} alt={alt} className="rounded-lg w-full h-auto object-cover" />;
};

export default ImageViewer;