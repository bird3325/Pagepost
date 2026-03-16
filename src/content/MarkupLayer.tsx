import React, { useRef, useState, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';

export const MarkupLayer: React.FC = () => {
    const { mode, markups, addMarkup, deleteMarkup, currentTool, currentColor, settings } = useNoteStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false); // Keep for UI/render cycle
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw all markups
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw existing markups
            markups.forEach(markup => {
                if ((markup.type === 'pen' || markup.type === 'highlight') && markup.points) {
                    ctx.beginPath();
                    ctx.strokeStyle = markup.style.strokeColor;
                    ctx.lineWidth = markup.style.strokeWidth;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.globalAlpha = markup.style.opacity;

                    const points = markup.points;
                    if (points.length > 0) {
                        ctx.moveTo(points[0].x, points[0].y);
                        for (let i = 1; i < points.length; i++) {
                            ctx.lineTo(points[i].x, points[i].y);
                        }
                    }
                    ctx.stroke();
                }
            });

            // Draw current path
            if (currentPoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentTool === 'highlight' ? settings.highlightWidth : settings.penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = currentTool === 'highlight' ? 0.4 : 1.0;

                ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
                for (let i = 1; i < currentPoints.length; i++) {
                    ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
                }
                ctx.stroke();
            }
        };

        render();
    }, [markups, isDrawing, currentPoints, currentColor, currentTool, canvasSize]);

    // Handle canvas resizing to match document
    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current) {
                const body = document.body;
                const html = document.documentElement;
                if (!body || !html) return;
                const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
                const width = html.clientWidth; // Use clientWidth to exclude scrollbar width

                // Only update if size actually changed to avoid unnecessary canvas clears
                if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
                    canvasRef.current.width = width;
                    canvasRef.current.height = height;
                    setCanvasSize({ width, height });
                }
            }
        };
        updateSize();

        const interval = setInterval(updateSize, 2000);
        window.addEventListener('resize', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            clearInterval(interval);
        };
    }, []);

    // We no longer return null here to keep markups visible in all modes
    // if (mode !== 'markup') return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== 'markup') return; // Only allow interaction in markup mode
        e.preventDefault(); // Prevent text selection/drag interference
        drawingRef.current = true;
        setIsDrawing(true);
        const y = e.clientY + window.scrollY;

        if (currentTool === 'eraser') {
            checkAndErase(e.clientX, y);
        } else {
            setCurrentPoints([{ x: e.clientX, y }]);
        }
    };

    const checkAndErase = (x: number, y: number) => {
        const threshold = 15; // Detection radius
        const markupToDelete = markups.find(markup => {
            if (!markup.points) return false;
            return markup.points.some(p => {
                const distance = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                return distance < threshold;
            });
        });

        if (markupToDelete) {
            deleteMarkup(markupToDelete.id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawingRef.current) return;
        const y = e.clientY + window.scrollY;

        if (currentTool === 'eraser') {
            checkAndErase(e.clientX, y);
        } else {
            setCurrentPoints(prev => [...prev, { x: e.clientX, y }]);
        }
    };

    const handleMouseUp = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        setIsDrawing(false);

        if (currentPoints.length > 1) {
            addMarkup({
                id: crypto.randomUUID(),
                url: window.location.href,
                type: currentTool,
                points: currentPoints,
                style: {
                    strokeColor: currentColor,
                    strokeWidth: currentTool === 'highlight' ? settings.highlightWidth : settings.penWidth,
                    opacity: currentTool === 'highlight' ? 0.4 : 1.0
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }
        setCurrentPoints([]);
    };

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-auto"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: mode === 'markup'
                    ? (currentTool === 'highlight' ? 'cell' : currentTool === 'eraser' ? 'not-allowed' : 'crosshair')
                    : 'default',
                zIndex: 10,
                maxWidth: '100%',
                display: 'block',
                pointerEvents: mode === 'markup' ? 'auto' : 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    );
};
