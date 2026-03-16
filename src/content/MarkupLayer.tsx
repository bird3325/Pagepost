import React, { useRef, useState, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { type MarkupType } from '../db';
import { captureAnchor, restoreElement, getRelativePoint, getAbsolutePoint } from '../utils/anchoring';

export const MarkupLayer: React.FC = () => {
    const { mode, notes, markups, addMarkup, deleteMarkup, currentTool, currentColor, settings, activeNoteId, selectedMarkupId, setSelectedMarkupId } = useNoteStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const [isDrawing, setIsDrawing] = useState(false); // Keep for UI/render cycle
    const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const getPagePoints = (markup: any) => {
        let points = markup.points || [];
        if (points.length < 1) return [];

        if (markup.linkedNoteId) {
            const linkedNote = notes.find(n => n.id === markup.linkedNoteId);
            if (linkedNote) {
                return points.map((p: any) => ({
                    x: (linkedNote.notePosition.x + p.x),
                    y: (linkedNote.notePosition.y + p.y)
                }));
            }
            return [];
        } else if (markup.anchor) {
            const el = restoreElement(markup.anchor);
            if (el) {
                return points.map((p: any) => getAbsolutePoint(el, p.x, p.y));
            }
            return [];
        }
        return points;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw all markups
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Helper to draw an arrow
            const drawArrow = (fromX: number, fromY: number, toX: number, toY: number) => {
                const headlen = 10;
                const angle = Math.atan2(toY - fromY, toX - fromX);
                ctx.beginPath();
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
                ctx.stroke();
            };

            // Draw existing markups
            markups.forEach((markup: any) => {
                let points = getPagePoints(markup);
                if (points.length < 1) return;

                // --- STYLING ---
                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Base style from markup
                ctx.strokeStyle = markup.style.strokeColor;
                ctx.lineWidth = markup.style.strokeWidth;
                ctx.globalAlpha = markup.style.opacity;

                // Selection / Active highlight
                const isActive = markup.linkedNoteId === activeNoteId;
                const isSelected = markup.id === selectedMarkupId;

                if (isActive || isSelected) {
                    ctx.shadowColor = isSelected ? '#ffffff' : markup.style.strokeColor;
                    ctx.shadowBlur = isSelected ? 20 : 10;
                    ctx.globalAlpha = 1.0;
                    if (isSelected) {
                        ctx.lineWidth = markup.style.strokeWidth + 3;
                    }
                } else {
                    ctx.shadowBlur = 0;
                    ctx.shadowColor = 'transparent';
                }

                // Actually draw based on type
                if (markup.type === 'pen' || markup.type === 'highlight') {
                    if (markup.type === 'highlight') ctx.globalAlpha = 0.4;
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y);
                    }
                    ctx.stroke();
                } else if (markup.type === 'rect' && points.length >= 2) {
                    const x = Math.min(points[0].x, points[1].x);
                    const y = Math.min(points[0].y, points[1].y);
                    const w = Math.abs(points[0].x - points[1].x);
                    const h = Math.abs(points[0].y - points[1].y);
                    ctx.strokeRect(x, y, w, h);
                } else if (markup.type === 'circle' && points.length >= 2) {
                    const centerX = (points[0].x + points[1].x) / 2;
                    const centerY = (points[0].y + points[1].y) / 2;
                    const radiusX = Math.abs(points[0].x - points[1].x) / 2;
                    const radiusY = Math.abs(points[0].y - points[1].y) / 2;
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                } else if (markup.type === 'arrow' && points.length >= 2) {
                    drawArrow(points[0].x, points[0].y, points[1].x, points[1].y);
                } else if (markup.type === 'sticker' && points.length >= 1) {
                    ctx.font = '32px apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(markup.content || '✅', points[0].x, points[0].y);
                } else if (points.length >= 2) {
                    // Complex Shapes
                    const [p1, p2] = points;
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p1.x - p2.x);
                    const h = Math.abs(p1.y - p2.y);
                    const centerX = x + w / 2;
                    const centerY = y + h / 2;

                    ctx.beginPath();
                    if (markup.type === 'star') {
                        const spikes = 5;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius / 2.5;
                        let rot = Math.PI / 2 * 3;
                        let cx = centerX;
                        let cy = centerY;
                        let step = Math.PI / spikes;

                        ctx.moveTo(centerX, centerY - outerRadius);
                        for (let i = 0; i < spikes; i++) {
                            cx = centerX + Math.cos(rot) * outerRadius;
                            cy = centerY + Math.sin(rot) * outerRadius;
                            ctx.lineTo(cx, cy);
                            rot += step;

                            cx = centerX + Math.cos(rot) * innerRadius;
                            cy = centerY + Math.sin(rot) * innerRadius;
                            ctx.lineTo(cx, cy);
                            rot += step;
                        }
                        ctx.lineTo(centerX, centerY - outerRadius);
                    } else if (markup.type === 'heart') {
                        const topCurveHeight = h * 0.3;
                        ctx.moveTo(centerX, y + h);
                        ctx.bezierCurveTo(x, centerY, x, y, centerX, y + topCurveHeight);
                        ctx.bezierCurveTo(x + w, y, x + w, centerY, centerX, y + h);
                    } else if (markup.type === 'triangle') {
                        ctx.moveTo(centerX, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(x, y + h);
                        ctx.closePath();
                    } else if (markup.type === 'chat') {
                        const r = Math.min(w, h) * 0.2;
                        ctx.moveTo(x + r, y);
                        ctx.lineTo(x + w - r, y);
                        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                        ctx.lineTo(x + w, y + h - r * 2);
                        ctx.quadraticCurveTo(x + w, y + h - r, x + w - r, y + h - r);
                        ctx.lineTo(centerX + r, y + h - r);
                        ctx.lineTo(centerX, y + h);
                        ctx.lineTo(centerX - r, y + h - r);
                        ctx.lineTo(x + r, y + h - r);
                        ctx.quadraticCurveTo(x, y + h - r, x, y + h - r * 2);
                        ctx.lineTo(x, y + r);
                        ctx.quadraticCurveTo(x, y, x + r, y);
                    } else if (markup.type === 'lightning') {
                        ctx.moveTo(x + w * 0.6, y);
                        ctx.lineTo(x, centerY);
                        ctx.lineTo(x + w * 0.4, centerY);
                        ctx.lineTo(x + w * 0.3, y + h);
                        ctx.lineTo(x + w, centerY);
                        ctx.lineTo(x + w * 0.6, centerY);
                        ctx.closePath();
                    } else if (markup.type === 'diamond') {
                        ctx.moveTo(centerX, y);
                        ctx.lineTo(x + w, centerY);
                        ctx.lineTo(centerX, y + h);
                        ctx.lineTo(x, centerY);
                        ctx.closePath();
                    } else if (markup.type === 'pentagon') {
                        for (let i = 0; i < 5; i++) {
                            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                            ctx.lineTo(centerX + (w / 2) * Math.cos(angle), centerY + (h / 2) * Math.sin(angle));
                        }
                        ctx.closePath();
                    } else if (markup.type === 'hexagon') {
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
                            ctx.lineTo(centerX + (w / 2) * Math.cos(angle), centerY + (h / 2) * Math.sin(angle));
                        }
                        ctx.closePath();
                    } else if (markup.type === 'cross') {
                        const thickness = 0.3;
                        ctx.moveTo(x + w * (0.5 - thickness / 2), y);
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y);
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w, y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w, y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h);
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h);
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x, y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x, y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h * (0.5 - thickness / 2));
                        ctx.closePath();
                    } else if (markup.type === 'cloud') {
                        ctx.moveTo(x + w * 0.2, y + h * 0.7);
                        ctx.bezierCurveTo(x, y + h * 0.7, x, y + h * 0.2, x + w * 0.35, y + h * 0.3);
                        ctx.bezierCurveTo(x + w * 0.3, y, x + w * 0.7, y, x + w * 0.75, y + h * 0.2);
                        ctx.bezierCurveTo(x + w, y + h * 0.2, x + w, y + h * 0.7, x + w * 0.8, y + h * 0.7);
                        ctx.closePath();
                    } else if (markup.type === 'banner') {
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(centerX, y + h * 0.8);
                        ctx.lineTo(x, y + h);
                        ctx.closePath();
                    } else if (markup.type === 'burst1' || markup.type === 'burst2') {
                        const spikes = markup.type === 'burst1' ? 12 : 8;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius * 0.6;
                        for (let i = 0; i < spikes * 2; i++) {
                            const radius = i % 2 === 0 ? outerRadius : innerRadius;
                            const angle = (i * Math.PI / spikes) - Math.PI / 2;
                            ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                        }
                        ctx.closePath();
                    }
                    ctx.stroke();
                }
            });

            // Draw current preview path
            if (currentPoints.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentTool === 'highlight' ? settings.highlightWidth : settings.penWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = currentTool === 'highlight' ? 0.4 : 1.0;

                if (currentTool === 'pen' || currentTool === 'highlight') {
                    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
                    for (let i = 1; i < currentPoints.length; i++) {
                        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
                    }
                    ctx.stroke();
                } else if (currentTool === 'rect' && currentPoints.length >= 2) {
                    const start = currentPoints[0];
                    const end = currentPoints[currentPoints.length - 1];
                    ctx.strokeRect(
                        Math.min(start.x, end.x), Math.min(start.y, end.y),
                        Math.abs(start.x - end.x), Math.abs(start.y - end.y)
                    );
                } else if (currentTool === 'circle' && currentPoints.length >= 2) {
                    const start = currentPoints[0];
                    const end = currentPoints[currentPoints.length - 1];
                    const centerX = (start.x + end.x) / 2;
                    const centerY = (start.y + end.y) / 2;
                    const radiusX = Math.abs(start.x - end.x) / 2;
                    const radiusY = Math.abs(start.y - end.y) / 2;
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                } else if (currentTool === 'arrow' && currentPoints.length >= 2) {
                    const start = currentPoints[0];
                    const end = currentPoints[currentPoints.length - 1];
                    drawArrow(start.x, start.y, end.x, end.y);
                } else if (currentPoints.length >= 2) {
                    // Preview for complex shapes
                    const start = currentPoints[0];
                    const end = currentPoints[currentPoints.length - 1];
                    const x = Math.min(start.x, end.x);
                    const y = Math.min(start.y, end.y);
                    const w = Math.abs(start.x - end.x);
                    const h = Math.abs(start.y - end.y);
                    const centerX = x + w / 2;
                    const centerY = y + h / 2;

                    ctx.beginPath();
                    if (currentTool === 'star') {
                        const spikes = 5;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius / 2.5;
                        let rot = Math.PI / 2 * 3;
                        let cx = centerX;
                        let cy = centerY;
                        let step = Math.PI / spikes;

                        ctx.moveTo(centerX, centerY - outerRadius);
                        for (let i = 0; i < spikes; i++) {
                            cx = centerX + Math.cos(rot) * outerRadius;
                            cy = centerY + Math.sin(rot) * outerRadius;
                            ctx.lineTo(cx, cy);
                            rot += step;

                            cx = centerX + Math.cos(rot) * innerRadius;
                            cy = centerY + Math.sin(rot) * innerRadius;
                            ctx.lineTo(cx, cy);
                            rot += step;
                        }
                        ctx.lineTo(centerX, centerY - outerRadius);
                    } else if (currentTool === 'heart') {
                        const topCurveHeight = h * 0.3;
                        ctx.moveTo(centerX, y + h);
                        ctx.bezierCurveTo(x, centerY, x, y, centerX, y + topCurveHeight);
                        ctx.bezierCurveTo(x + w, y, x + w, centerY, centerX, y + h);
                    } else if (currentTool === 'triangle') {
                        ctx.moveTo(centerX, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(x, y + h);
                        ctx.closePath();
                    } else if (currentTool === 'chat') {
                        const r = Math.min(w, h) * 0.2;
                        ctx.moveTo(x + r, y);
                        ctx.lineTo(x + w - r, y);
                        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                        ctx.lineTo(x + w, y + h - r * 2);
                        ctx.quadraticCurveTo(x + w, y + h - r, x + w - r, y + h - r);
                        ctx.lineTo(centerX + r, y + h - r);
                        ctx.lineTo(centerX, y + h);
                        ctx.lineTo(centerX - r, y + h - r);
                        ctx.lineTo(x + r, y + h - r);
                        ctx.quadraticCurveTo(x, y + h - r, x, y + h - r * 2);
                        ctx.lineTo(x, y + r);
                        ctx.quadraticCurveTo(x, y, x + r, y);
                    } else if (currentTool === 'lightning') {
                        ctx.moveTo(x + w * 0.6, y);
                        ctx.lineTo(x, centerY);
                        ctx.lineTo(x + w * 0.4, centerY);
                        ctx.lineTo(x + w * 0.3, y + h);
                        ctx.lineTo(x + w, centerY);
                        ctx.lineTo(x + w * 0.6, centerY);
                        ctx.closePath();
                    } else if (currentTool === 'diamond') {
                        ctx.moveTo(centerX, y);
                        ctx.lineTo(x + w, centerY);
                        ctx.lineTo(centerX, y + h);
                        ctx.lineTo(x, centerY);
                        ctx.closePath();
                    } else if (currentTool === 'pentagon') {
                        for (let i = 0; i < 5; i++) {
                            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                            ctx.lineTo(centerX + (w / 2) * Math.cos(angle), centerY + (h / 2) * Math.sin(angle));
                        }
                        ctx.closePath();
                    } else if (currentTool === 'hexagon') {
                        for (let i = 0; i < 6; i++) {
                            const angle = (i * 2 * Math.PI / 6) - Math.PI / 2;
                            ctx.lineTo(centerX + (w / 2) * Math.cos(angle), centerY + (h / 2) * Math.sin(angle));
                        }
                        ctx.closePath();
                    } else if (currentTool === 'cross') {
                        const thickness = 0.3;
                        ctx.moveTo(x + w * (0.5 - thickness / 2), y);
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y);
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w, y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w, y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x + w * (0.5 + thickness / 2), y + h);
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h);
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x, y + h * (0.5 + thickness / 2));
                        ctx.lineTo(x, y + h * (0.5 - thickness / 2));
                        ctx.lineTo(x + w * (0.5 - thickness / 2), y + h * (0.5 - thickness / 2));
                        ctx.closePath();
                    } else if (currentTool === 'cloud') {
                        ctx.moveTo(x + w * 0.2, y + h * 0.7);
                        ctx.bezierCurveTo(x, y + h * 0.7, x, y + h * 0.2, x + w * 0.35, y + h * 0.3);
                        ctx.bezierCurveTo(x + w * 0.3, y, x + w * 0.7, y, x + w * 0.75, y + h * 0.2);
                        ctx.bezierCurveTo(x + w, y + h * 0.2, x + w, y + h * 0.7, x + w * 0.8, y + h * 0.7);
                        ctx.closePath();
                    } else if (currentTool === 'banner') {
                        ctx.moveTo(x, y);
                        ctx.lineTo(x + w, y);
                        ctx.lineTo(x + w, y + h);
                        ctx.lineTo(centerX, y + h * 0.8);
                        ctx.lineTo(x, y + h);
                        ctx.closePath();
                    } else if (currentTool === 'burst1' || currentTool === 'burst2') {
                        const spikes = currentTool === 'burst1' ? 12 : 8;
                        const outerRadius = Math.min(w, h) / 2;
                        const innerRadius = outerRadius * 0.6;
                        for (let i = 0; i < spikes * 2; i++) {
                            const radius = i % 2 === 0 ? outerRadius : innerRadius;
                            const angle = (i * Math.PI / spikes) - Math.PI / 2;
                            ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                        }
                        ctx.closePath();
                    }
                    ctx.stroke();
                }
            }
        };

        render();
    }, [markups, isDrawing, currentPoints, currentColor, currentTool, canvasSize, selectedMarkupId, activeNoteId, notes, settings]);

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

        const x = e.clientX + window.scrollX;
        const y = e.clientY + window.scrollY;

        if (currentTool === 'select') {
            checkAndSelect(x, y);
            return; // Don't start drawing
        }

        e.preventDefault();
        drawingRef.current = true;
        setIsDrawing(true);

        if (currentTool === 'eraser') {
            checkAndErase(x, y);
        } else if (currentTool === 'sticker') {
            const sticker = (window as any).__pagepost_selected_sticker || '✅';

            // Find element for sticker anchor
            const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
            let anchor = undefined;
            if (element && element !== document.body && element !== document.documentElement) {
                anchor = captureAnchor(element, x, y);
            }

            addMarkup({
                id: crypto.randomUUID(),
                url: window.location.href,
                type: 'sticker',
                points: [{ x, y }],
                content: sticker,
                anchor,
                linkedNoteId: activeNoteId || undefined,
                style: {
                    strokeColor: currentColor,
                    strokeWidth: 1,
                    opacity: 1.0
                },
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            drawingRef.current = false;
            setIsDrawing(false);
        } else {
            // For drawing tools (pen, highlight, shapes)
            drawingRef.current = true;
            setIsDrawing(true);
            setCurrentPoints([{ x, y }]);
        }
    };

    const checkAndSelect = (x: number, y: number) => {
        const threshold = 40; // Increased radius for easier hit detection
        const found = markups.find(markup => {
            // Get actual page coordinates for this markup
            const points = getPagePoints(markup);

            if (points.length === 0) return false;

            // For stickers, check distance to the single point
            if (markup.type === 'sticker') {
                const p = points[0];
                const distance = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                return distance < 50; // Even larger hit area for stickers
            }

            // For paths and shapes, check distance to any point
            return points.some((p: { x: number; y: number }) => {
                const distance = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                return distance < threshold;
            });
        });

        if (found) {
            setSelectedMarkupId(found.id);
            // Sync toolbar attributes to the selected markup's current state
            useNoteStore.setState({
                currentColor: found.style.strokeColor
            });
        } else {
            setSelectedMarkupId(null);
        }
    };

    const checkAndErase = (x: number, y: number) => {
        const threshold = 15; // Detection radius
        const markupToDelete = markups.find(markup => {
            const points = getPagePoints(markup);
            if (points.length === 0) return false;
            return points.some((p: { x: number; y: number }) => {
                const distance = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                return distance < threshold;
            });
        });

        if (markupToDelete) {
            deleteMarkup(markupToDelete.id);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawingRef.current || mode !== 'markup') return;
        const x = e.clientX + window.scrollX;
        const y = e.clientY + window.scrollY;

        if (currentTool === 'eraser') {
            checkAndErase(x, y);
        } else {
            setCurrentPoints(prev => [...prev, { x, y }]);
        }
    };

    const handleMouseUp = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        setIsDrawing(false);

        if (currentPoints.length > 1) {
            // For shapes, we only need start and end points
            const isShape = ['rect', 'circle', 'arrow', 'star', 'heart', 'triangle', 'chat', 'lightning', 'diamond', 'pentagon', 'hexagon', 'cross', 'cloud', 'banner', 'burst1', 'burst2'].includes(currentTool as any);
            const rawPoints = isShape ? [currentPoints[0], currentPoints[currentPoints.length - 1]] : currentPoints;

            // Only add markup if we have a valid tool
            if (currentTool === 'select' || currentTool === 'eraser') {
                setCurrentPoints([]);
                return;
            }

            // --- Smart Anchoring Logic ---
            // 1. Find the element under the first point
            const startPoint = rawPoints[0];
            const element = document.elementFromPoint(startPoint.x, startPoint.y - window.scrollY) as HTMLElement;

            let anchor = undefined;
            let finalPoints = rawPoints;

            if (activeNoteId) {
                const activeNote = notes.find(n => n.id === activeNoteId);
                if (activeNote) {
                    // Store points relative to the note's position
                    // Note: rawPoints are already page-relative
                    finalPoints = rawPoints.map(p => ({
                        x: p.x - activeNote.notePosition.x,
                        y: p.y - activeNote.notePosition.y
                    }));
                }
            } else if (element && element !== document.body && element !== document.documentElement) {
                // Standard element anchoring
                anchor = captureAnchor(element, startPoint.x, startPoint.y);
                finalPoints = rawPoints.map((p: any) => getRelativePoint(element, p.x, p.y));
            }

            addMarkup({
                id: crypto.randomUUID(),
                url: window.location.href,
                type: currentTool as MarkupType,
                points: finalPoints,
                anchor, // Store anchor info
                linkedNoteId: activeNoteId || undefined,
                style: {
                    strokeColor: currentColor,
                    strokeWidth: settings[`${currentTool}Width` as keyof typeof settings] as number || settings.penWidth || 2,
                    opacity: currentTool === 'highlight' ? 0.3 : 1.0
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
                    ? (currentTool === 'select' ? 'pointer' : currentTool === 'highlight' ? 'cell' : currentTool === 'eraser' ? 'not-allowed' : 'crosshair')
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
