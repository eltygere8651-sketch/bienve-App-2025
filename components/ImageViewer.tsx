import React, { useState, useEffect } from 'react';
import { TestTubeDiagonal } from 'lucide-react';

interface ImageViewerProps {
    imageBlob: File | Blob;
    alt: string;
    isTestData?: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageBlob, alt, isTestData }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (imageBlob instanceof Blob && imageBlob.size > 0) {
            const url = URL.createObjectURL(imageBlob);
            setImageUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setImageUrl(null); // Reset if blob is empty
        }
    }, [imageBlob]);

    if (isTestData && !imageUrl) {
        return (
            <div className="rounded-lg w-full h-32 bg-amber-100 dark:bg-amber-900/50 flex flex-col items-center justify-center text-xs text-amber-600 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <TestTubeDiagonal size={24} />
                <span className="mt-2 font-semibold">Imagen de Prueba</span>
            </div>
        );
    }

    if (!imageUrl) {
        return <div className="rounded-lg w-full h-32 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">Sin Imagen</div>;
    }

    return <img src={imageUrl} alt={alt} className="rounded-lg w-full h-auto object-cover" />;
};

export default ImageViewer;
