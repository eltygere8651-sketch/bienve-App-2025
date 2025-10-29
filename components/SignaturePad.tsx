import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    width?: number;
    height?: number;
    onDrawEnd?: () => void;
}

export interface SignaturePadRef {
    clear: () => void;
    toDataURL: () => string | undefined;
    isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
    ({ width = 400, height = 200, onDrawEnd }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [isEmpty, setIsEmpty] = useState(true);

        const getCanvasContext = () => {
            return canvasRef.current?.getContext('2d');
        };
        
        useEffect(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                // Adjust for device pixel ratio for sharper lines
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                canvas.width = width * ratio;
                canvas.height = height * ratio;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.scale(ratio, ratio);
                    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                }
            }
        }, [width, height]);
        
        const getCoords = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
            const canvas = canvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            
            if (e instanceof MouseEvent) {
                return { x: e.clientX - rect.left, y: e.clientY - rect.top };
            }
            if (e.touches && e.touches.length > 0) {
                 return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            return null;
        }

        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
            const ctx = getCanvasContext();
            const coords = getCoords(e.nativeEvent);
            if (ctx && coords) {
                ctx.beginPath();
                ctx.moveTo(coords.x, coords.y);
                setIsDrawing(true);
            }
        };

        const draw = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing) return;
            // Prevent scrolling on touch devices while drawing
            e.preventDefault();
            const ctx = getCanvasContext();
            const coords = getCoords(e.nativeEvent);
            if (ctx && coords) {
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
                setIsEmpty(false);
            }
        };

        const stopDrawing = () => {
            const ctx = getCanvasContext();
            if(ctx) {
                ctx.closePath();
                setIsDrawing(false);
                if (onDrawEnd) onDrawEnd();
            }
        };

        const clear = () => {
            const ctx = getCanvasContext();
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                setIsEmpty(true);
            }
        };
        
        useImperativeHandle(ref, () => ({
            clear,
            toDataURL: () => {
                if (isEmpty) return undefined;
                return canvasRef.current?.toDataURL('image/png');
            },
            isEmpty: () => isEmpty,
        }));

        return (
            <div className="relative w-full max-w-lg">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="border border-gray-300 dark:border-gray-600 rounded-md touch-none bg-gray-50 dark:bg-gray-700/50"
                    style={{ width: `${width}px`, height: `${height}px` }}
                />
                <button
                    type="button"
                    onClick={clear}
                    className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    aria-label="Limpiar firma"
                >
                    <Eraser size={18} />
                </button>
            </div>
        );
    }
);

export default SignaturePad;