import React, { useState, useRef, useMemo } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { type Note } from '../db';
import {
    ZoomIn,
    ZoomOut,
    RefreshCcw,
    ExternalLink,
    Folder,
    ChevronDown
} from 'lucide-react';

export const CanvasDashboard: React.FC = () => {
    const {
        notes,
        updateCanvasPosition,
        searchQuery,
        projects,
        moveNoteToProject,
        currentProjectId
    } = useNoteStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [activeProjectMenuId, setActiveProjectMenuId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    const filteredNotes = useMemo(() => {
        let result = notes;
        if (currentProjectId) {
            result = result.filter(n => n.projectId === currentProjectId);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(n =>
                n.content.toLowerCase().includes(q) ||
                n.domain.toLowerCase().includes(q) ||
                n.tags.some(t => t.toLowerCase().includes(q))
            );
        }
        return result;
    }, [notes, searchQuery, currentProjectId]);

    // Pan logic
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left click
            setIsPanning(true);
            e.preventDefault();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setPan(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
        } else if (draggedNoteId) {
            // Update Canvas Position (Optimistic local move)
            const note = notes.find(n => n.id === draggedNoteId);
            if (note) {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
                    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

                    updateCanvasPosition(draggedNoteId, {
                        x: canvasX - dragOffset.current.x,
                        y: canvasY - dragOffset.current.y
                    });
                }
            }
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggedNoteId(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            const factor = Math.pow(1.1, delta / 100);
            const newZoom = Math.min(3, Math.max(0.2, zoom * factor));

            // Zoom at pointer
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const beforeX = (mouseX - pan.x) / zoom;
                const beforeY = (mouseY - pan.y) / zoom;

                const afterX = beforeX * newZoom;
                const afterY = beforeY * newZoom;

                setPan({
                    x: mouseX - afterX,
                    y: mouseY - afterY
                });
                setZoom(newZoom);
            }
        } else {
            // Regular scroll pans
            setPan(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const handleNoteDragStart = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const canvasX = (e.clientX - rect.left - pan.x) / zoom;
            const canvasY = (e.clientY - rect.top - pan.y) / zoom;

            dragOffset.current = {
                x: canvasX - (note.canvasPosition?.x || 0),
                y: canvasY - (note.canvasPosition?.y || 0)
            };
            setDraggedNoteId(note.id);
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Background Grid */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    opacity: 0.5
                }}
            />

            {/* Canvas Content */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                }}
            >
                {filteredNotes.map(note => (
                    <div
                        key={note.id}
                        className="absolute pointer-events-auto group"
                        style={{
                            left: note.canvasPosition?.x || 0,
                            top: note.canvasPosition?.y || 0,
                            width: note.size.width,
                            zIndex: draggedNoteId === note.id ? 10 : 1
                        }}
                        onMouseDown={(e) => handleNoteDragStart(e, note)}
                    >
                        {/* Note Card UI on Canvas */}
                        <div className={`p-4 rounded-2xl shadow-lg border border-slate-200 transition-all hover:shadow-xl ${draggedNoteId === note.id ? 'scale-105' : 'scale-100'}`}
                            style={{ backgroundColor: 'white', borderLeft: `6px solid ${note.color}` }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{note.domain}</span>
                                <a
                                    href={note.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-primary"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </div>

                            {/* Project Selector for Canvas */}
                            <div className="relative mb-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveProjectMenuId(activeProjectMenuId === note.id ? null : note.id);
                                    }}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-[9px] font-bold text-slate-500 group/prj w-full justify-between"
                                >
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Folder size={10} className={note.projectId ? "text-brand-primary" : "text-slate-400"} />
                                        <span className="truncate">
                                            {projects.find(p => p.id === note.projectId)?.name || '미분류'}
                                        </span>
                                    </div>
                                    <ChevronDown size={10} className="text-slate-300 group-hover/prj:text-brand-primary flex-shrink-0" />
                                </button>

                                {activeProjectMenuId === note.id && (
                                    <>
                                        <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setActiveProjectMenuId(null); }} />
                                        <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 z-[110] py-1 animate-in zoom-in-95 duration-200">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveNoteToProject(note.id, null);
                                                    setActiveProjectMenuId(null);
                                                }}
                                                className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-slate-50 flex items-center gap-2 ${!note.projectId ? 'text-brand-primary font-bold' : 'text-slate-600'}`}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> 미분류
                                            </button>
                                            {projects.map(project => (
                                                <button
                                                    key={project.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveNoteToProject(note.id, project.id);
                                                        setActiveProjectMenuId(null);
                                                    }}
                                                    className={`w-full px-3 py-1.5 text-left text-[10px] hover:bg-slate-50 flex items-center gap-2 ${note.projectId === project.id ? 'text-brand-primary font-bold' : 'text-slate-600'}`}
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color || '#CBD5E1' }} />
                                                    <span className="truncate">{project.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-4 whitespace-pre-wrap italic"
                                style={{ fontFamily: note.fontFamily, fontSize: note.fontSize }}>
                                {note.content}
                            </p>
                            {note.tags.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {note.tags.map(tag => (
                                        <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">#{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Canvas Controls */}
            <div className="absolute bottom-8 left-8 flex items-center gap-2 p-2 bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/50">
                <button
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ZoomIn size={18} className="text-slate-600" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200" />
                <button
                    onClick={() => setZoom(prev => Math.max(0.2, prev - 0.2))}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <ZoomOut size={18} className="text-slate-600" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200" />
                <button
                    onClick={() => { setPan({ x: window.innerWidth / 4, y: 100 }); setZoom(0.8); }}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                    <RefreshCcw size={18} className="text-slate-600" />
                </button>
                <div className="ml-2 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-400">
                    {Math.round(zoom * 100)}%
                </div>
            </div>

            {/* Mini Hint */}
            <div className="absolute top-8 right-8 px-4 py-2 bg-slate-900/10 backdrop-blur rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-widest border border-white/20">
                Alt + Drag to Pan · Scroll to Zoom
            </div>
        </div>
    );
};
