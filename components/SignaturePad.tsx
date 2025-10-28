import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

interface SignaturePadProps {
    isError?: boolean;
    onDrawStart?: () => void;
}

const SignaturePad = forwardRef<
    { clear: () => void; getSignature: () => string | null },
    SignaturePadProps
>(({ isError, onDrawStart }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const { theme } = useAppContext();
    
    // Function to set canvas context properties
    const setCanvasContext = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = theme === 'dark' ? '#d1d5db' : '#374151'; // gray-300 or gray-700
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.fillStyle = ctx.strokeStyle;
        }
    };
    
    const getPos = (canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        const event = 'touches' in e ? e.touches[0] : e;
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
        e.preventDefault();
        onDrawStart?.();
        isDrawing.current = true;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(canvas, e);
        
        lastPoint.current = pos;
        
        // Draw a dot for the start
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault();
        
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const currentPoint = getPos(canvas, e);
        
        if (!lastPoint.current) return;
        
        const midPoint = {
            x: (lastPoint.current.x + currentPoint.x) / 2,
            y: (lastPoint.current.y + currentPoint.y) / 2
        };

        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midPoint.x, midPoint.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(midPoint.x, midPoint.y);
        
        lastPoint.current = currentPoint;
    };
    
    const stopDrawing = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        lastPoint.current = null;
        
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath(); // End the path
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(ratio, ratio);
                setCanvasContext(canvas);
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Use an observer to re-initialize colors when theme changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    setCanvasContext(canvas);
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            observer.disconnect();
            // Cleanup all event listeners
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
            canvas.removeEventListener('touchcancel', stopDrawing);
        };
    }, [theme]); // Re-run effect if theme changes to update stroke color

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const getSignature = (): string | null => {
        const canvas = canvasRef.current;
        if (!canvas || isCanvasBlank(canvas)) {
            return null;
        }
        return canvas.toDataURL('image/png');
    };

    const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return true;
        const pixelBuffer = new Uint32Array(
            context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
        );
        return !pixelBuffer.some(color => color !== 0);
    };

    useImperativeHandle(ref, () => ({
        clear,
        getSignature,
    }));
    
    // Add shake animation class
    const errorClasses = isError ? 'border-red-500 animate-shake' : 'border-gray-300 dark:border-gray-600';

    return (
        <div className={`relative w-full h-40 border rounded-lg bg-gray-50 dark:bg-gray-700/50 transition-colors ${errorClasses}`}>
            <canvas ref={canvasRef} className="w-full h-full" />
            <button
                type="button"
                onClick={clear}
                className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                aria-label="Limpiar firma"
            >
                <X size={16} />
            </button>
        </div>
    );
});

// Adding a simple shake animation to tailwind config is not possible here. Let's add it via a style tag if it doesn't exist.
if (!document.getElementById('signature-pad-animations')) {
    const style = document.createElement('style');
    style.id = 'signature-pad-animations';
    style.innerHTML = `
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-shake {
            animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        }
    `;
    document.head.appendChild(style);
}

export default SignaturePad;