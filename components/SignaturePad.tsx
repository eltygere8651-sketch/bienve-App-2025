import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useLayoutEffect } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onDrawEnd?: () => void;
}

export interface SignaturePadRef {
    clear: () => void;
    toDataURL: () => string | undefined;
    isEmpty: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
    ({ onDrawEnd }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [isEmpty, setIsEmpty] = useState(true);

        const getCanvasContext = () => {
            return canvasRef.current?.getContext('2d');
        };

        const configureCanvas = (canvas: HTMLCanvasElement) => {
             const ratio = Math.max(window.devicePixelRatio || 1, 1);
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(ratio, ratio);
                ctx.strokeStyle = '#FFFFFF'; // White ink for dark theme
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        };
        
        useLayoutEffect(() => {
            const canvas = canvasRef.current;
            if (canvas) {
                configureCanvas(canvas);
            }
            const resizeObserver = new ResizeObserver(() => {
                if(canvas) configureCanvas(canvas);
            });
            if(containerRef.current) {
                resizeObserver.observe(containerRef.current);
            }
            return () => resizeObserver.disconnect();
        }, []);
        
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
            const canvas = canvasRef.current;
            if (ctx && canvas) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
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
            <div ref={containerRef} className="relative w-full h-48 max-w-lg">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="border border-slate-600 rounded-md touch-none bg-slate-700 w-full h-full"
                />
                <button
                    type="button"
                    onClick={clear}
                    className="absolute top-2 right-2 p-2 bg-slate-600 text-slate-200 rounded-full hover:bg-slate-500 transition-colors"
                    aria-label="Limpiar firma"
                >
                    <Eraser size={18} />
                </button>
            </div>
        );
    }
);

export default SignaturePad;