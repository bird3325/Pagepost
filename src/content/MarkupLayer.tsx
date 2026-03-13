import React, { useRef, useState, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';

export const MarkupLayer: React.FC = () => {
    const { mode, markups, addMarkup, currentTool, currentColor } = useNoteStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

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
            if (isDrawing && currentPoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentTool === 'highlight' ? 20 : 3;
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
    }, [markups, isDrawing, currentPoints, currentColor, currentTool]);

    // Handle canvas resizing to match document
    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current) {
                const body = document.body;
                const html = document.documentElement;
                const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = height;
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

    if (mode !== 'markup') return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (currentTool === 'eraser') return;
        setIsDrawing(true);
        const y = e.clientY + window.scrollY;
        setCurrentPoints([{ x: e.clientX, y }]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const y = e.clientY + window.scrollY;
        setCurrentPoints(prev => [...prev, { x: e.clientX, y }]);
    };

    const handleMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (currentPoints.length > 1) {
            addMarkup({
                id: crypto.randomUUID(),
                url: window.location.href,
                type: currentTool,
                points: currentPoints,
                style: {
                    strokeColor: currentColor,
                    strokeWidth: currentTool === 'highlight' ? 20 : 3,
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
                cursor: currentTool === 'highlight' ? 'cell' : 'crosshair',
                zIndex: 10
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />
    );
};
