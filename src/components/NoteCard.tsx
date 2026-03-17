import React, { useState, useRef, useEffect, memo } from 'react';
import { type Note } from '../db';
import { useNoteStore } from '../store/useNoteStore';
import { captureAnchor, restoreElement } from '../utils/anchoring';
import {
    Pin,
    CheckCircle,
    Palette,
    ChevronUp,
    ChevronDown,
    GripHorizontal,
    X,
    Maximize2,
    User,
    Play,
    Clock
} from 'lucide-react';

interface NoteCardProps {
    note: Note;
}

const COLORS = [
    { name: 'Yellow', hex: '#FFF9C4', class: 'bg-note-yellow' },
    { name: 'Mint', hex: '#B2DFDB', class: 'bg-note-green' },
    { name: 'Pink', hex: '#F8BBD0', class: 'bg-note-pink' },
    { name: 'Lavender', hex: '#E1BEE7', class: 'bg-note-lavender' },
    { name: 'Sky', hex: '#BBDEFB', class: 'bg-note-blue' },
];

const NoteCardComponent: React.FC<NoteCardProps> = ({ note }) => {
    const { updateNote, deleteNote, settings, loadSettings, activeNoteId, setActiveNoteId } = useNoteStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // --- Smart Anchoring Restoration with Retry ---
    useEffect(() => {
        if (!note.anchor) return;

        let retryCount = 0;
        const maxRetries = 50;
        const retryInterval = 100; // 0.1 second

        const attemptRestoration = () => {
            const el = restoreElement(note.anchor!);
            if (el) {
                const rect = el.getBoundingClientRect();

                // Safety check: If the element is found but has no dimensions yet (still rendering/loading),
                // wait for the next retry instead of updating to potentially (0,0) coordinates.
                if (rect.width === 0 || rect.height === 0) {
                    return false;
                }

                const newX = rect.left + window.scrollX + (note.anchor!.position.x * rect.width);
                const newY = rect.top + window.scrollY + (note.anchor!.position.y * rect.height);

                // Safety check: If both coordinates are basically 0 but the previous position wasn't, 
                // this is likely a premature restoration or a hidden element. Discard and retry.
                if (Math.abs(newX) < 1 && Math.abs(newY) < 1 && (Math.abs(note.notePosition.x) > 5 || Math.abs(note.notePosition.y) > 5)) {
                    return false;
                }

                // Update physical position to move note to anchor
                if (Math.abs(newX - note.notePosition.x) > 1 || Math.abs(newY - note.notePosition.y) > 1) {
                    updateNote(note.id, {
                        notePosition: { x: newX, y: newY }
                    });
                }
                return true; // Success
            }
            return false; // Not found yet
        };

        // Initial attempt
        if (!attemptRestoration()) {
            const timer = setInterval(() => {
                retryCount++;
                if (attemptRestoration() || retryCount >= maxRetries) {
                    clearInterval(timer);
                }
            }, retryInterval);
            return () => clearInterval(timer);
        }
    }, [note.id]); // Run on mount or on ID change
    const [showColors, setShowColors] = useState(false);
    const [localContent, setLocalContent] = useState(note.content);

    const cardRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const interactionRef = useRef({
        isDragging: false,
        isResizing: false,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
        initialW: 0,
        initialH: 0
    });

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setActiveNoteId(note.id);

        interactionRef.current = {
            ...interactionRef.current,
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialX: note.notePosition.x,
            initialY: note.notePosition.y
        };

        const handleMouseMove = (ev: MouseEvent) => {
            if (!interactionRef.current.isDragging) return;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const dx = ev.clientX - interactionRef.current.startX;
                const dy = ev.clientY - interactionRef.current.startY;

                if (cardRef.current) {
                    cardRef.current.style.left = `${interactionRef.current.initialX + dx}px`;
                    cardRef.current.style.top = `${interactionRef.current.initialY + dy}px`;
                    cardRef.current.style.cursor = 'grabbing';
                }
            });
        };

        const handleMouseUp = (ev: MouseEvent) => {
            interactionRef.current.isDragging = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            const finalX = interactionRef.current.initialX + (ev.clientX - interactionRef.current.startX);
            const finalY = interactionRef.current.initialY + (ev.clientY - interactionRef.current.startY);

            // Re-anchor after move - Use center of the note for more reliable anchoring when collapsed
            const anchorPointX = note.isCollapsed ? finalX + 20 : finalX;
            const anchorPointY = note.isCollapsed ? finalY + 20 : finalY;

            if (cardRef.current) cardRef.current.style.pointerEvents = 'none';
            const element = document.elementFromPoint(anchorPointX - window.scrollX, anchorPointY - window.scrollY) as HTMLElement;
            if (cardRef.current) cardRef.current.style.pointerEvents = 'auto';

            let newAnchor = undefined;
            if (element && element !== document.body && element !== document.documentElement) {
                newAnchor = captureAnchor(element, anchorPointX, anchorPointY);
            }

            // Persistence: update storage exactly ONCE with all data to prevent flickering
            updateNote(note.id, {
                notePosition: { x: finalX, y: finalY },
                anchor: newAnchor
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        interactionRef.current = {
            ...interactionRef.current,
            isResizing: true,
            startX: e.clientX,
            startY: e.clientY,
            initialW: note.size.width,
            initialH: note.size.height
        };

        const handleMouseMove = (ev: MouseEvent) => {
            if (!interactionRef.current.isResizing) return;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const dx = ev.clientX - interactionRef.current.startX;
                const dy = ev.clientY - interactionRef.current.startY;

                if (cardRef.current && !note.isCollapsed) {
                    const newWidth = Math.max(150, interactionRef.current.initialW + dx);
                    const newHeight = Math.max(100, interactionRef.current.initialH + dy);
                    cardRef.current.style.width = `${newWidth}px`;
                    cardRef.current.style.height = `${newHeight}px`;
                }
            });
        };

        const handleMouseUpResize = (ev: MouseEvent) => {
            interactionRef.current.isResizing = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUpResize);

            const finalW = Math.max(150, interactionRef.current.initialW + (ev.clientX - interactionRef.current.startX));
            const finalH = Math.max(100, interactionRef.current.initialH + (ev.clientY - interactionRef.current.startY));

            updateNote(note.id, {
                size: { width: finalW, height: finalH }
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUpResize);
    };

    const currentColorClass = COLORS.find(c => c.hex === note.color)?.class || 'bg-note-yellow';

    return (
        <div
            ref={cardRef}
            data-note-id={note.id}
            onClick={() => setActiveNoteId(note.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`absolute rounded-lg shadow-lg border border-black/5 overflow-hidden flex flex-col pointer-events-auto transition-[opacity,transform,filter,ring-width] duration-300 ${currentColorClass} ${note.isCollapsed ? 'w-10 h-10' : ''} ${activeNoteId === note.id ? 'ring-2 ring-brand-primary' : ''} ${settings.isCleanView && !isHovered ? 'scale-95' : 'scale-100'}`}
            style={{
                left: note.notePosition.x,
                top: note.notePosition.y,
                width: note.isCollapsed ? undefined : note.size.width,
                height: note.isCollapsed ? undefined : note.size.height,
                zIndex: activeNoteId === note.id ? 200 : 100,
                opacity: settings.isCleanView
                    ? (isHovered ? 1.0 : 0.05)
                    : (note.status === 'done' ? 0.6 : 1.0),
                filter: settings.isCleanView && !isHovered ? 'grayscale(100%) blur(2px)' : 'none'
            }}
        >
            {/* Header / Drag Area */}
            <div
                className={`flex items-center ${note.isCollapsed ? 'h-10 justify-center' : 'h-8 justify-between px-2 border-b border-black/5'} cursor-grab active:cursor-grabbing flex-shrink-0`}
                onMouseDown={handleDragStart}
            >
                {note.isCollapsed ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isCollapsed: false }); }}
                        className="p-1 hover:bg-black/10 rounded transition-colors"
                        title="확장"
                    >
                        <ChevronDown size={14} />
                    </button>
                ) : (
                    <>
                        <div className="flex items-center gap-1">
                            <GripHorizontal size={14} className="text-black/30" />
                            <span className="text-[9px] font-bold text-black/40 mr-1">{new Date(note.updatedAt).toLocaleDateString()}</span>
                            {note.isPinned && <Pin size={12} className="text-red-500 fill-current" />}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isCollapsed: true }); }}
                                className="p-1 hover:bg-black/10 rounded transition-colors"
                                title="축소"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                className="p-1 hover:bg-black/10 rounded text-red-500 transition-colors"
                                title="삭제"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Assignee / Info Bar */}
            {!note.isCollapsed && note.assignee && (
                <div className="px-3 py-1 bg-black/5 flex items-center gap-1.5 border-b border-black/5">
                    <User size={10} className="text-black/40" />
                    <span className="text-[9px] font-bold text-black/60 uppercase tracking-tighter truncate">
                        Assignee: {note.assignee}
                    </span>
                </div>
            )}

            {!note.isCollapsed && (
                <>
                    {/* Content Area */}
                    <div className="flex-1 p-3 overflow-hidden">
                        {isEditing ? (
                            <textarea
                                autoFocus
                                className="w-full h-full bg-transparent resize-none border-none outline-none text-sm leading-relaxed"
                                style={{
                                    fontFamily: note.fontFamily || settings.fontFamily,
                                    fontSize: `${note.fontSize || settings.fontSize}px`,
                                    color: note.textColor || settings.textColor
                                }}
                                value={localContent}
                                onChange={(e) => setLocalContent(e.target.value)}
                                onBlur={() => {
                                    updateNote(note.id, { content: localContent });
                                    setIsEditing(false);
                                }}
                            />
                        ) : (
                            <div
                                className="w-full h-full text-sm leading-relaxed cursor-text whitespace-pre-wrap overflow-y-auto"
                                style={{
                                    fontFamily: note.fontFamily || settings.fontFamily,
                                    fontSize: `${note.fontSize || settings.fontSize}px`,
                                    color: note.textColor || settings.textColor
                                }}
                                onClick={() => {
                                    setLocalContent(note.content);
                                    setIsEditing(true);
                                }}
                            >
                                {note.content || "메모를 입력하세요..."}
                            </div>
                        )}
                    </div>

                    {/* Footer / Actions */}
                    <div className="h-8 flex items-center justify-between px-2 border-t border-black/5 text-[10px] text-black/50 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowColors(!showColors)}
                                className="p-1 hover:bg-black/10 rounded relative"
                                title="색상 변경"
                            >
                                <Palette size={14} />
                                {showColors && (
                                    <div className="absolute left-0 bottom-full mb-1 flex gap-1 bg-white p-1 rounded-md shadow-md border border-black/10 z-50">
                                        {COLORS.map(c => (
                                            <div
                                                key={c.hex}
                                                className={`w-4 h-4 rounded-full cursor-pointer border border-black/10 ${c.class}`}
                                                onClick={(e) => { e.stopPropagation(); updateNote(note.id, { color: c.hex }); setShowColors(false); }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                            <button
                                onClick={() => updateNote(note.id, { isPinned: !note.isPinned })}
                                className={`p-1 rounded ${note.isPinned ? 'bg-black/10 text-red-500' : 'hover:bg-black/10'}`}
                                title="고정"
                            >
                                <Pin size={14} />
                            </button>
                            <button
                                onClick={() => {
                                    const statusMap: Record<string, any> = {
                                        'pending': 'in-progress',
                                        'in-progress': 'done',
                                        'done': 'pending',
                                        'active': 'pending' // Fallback for legacy
                                    };
                                    updateNote(note.id, { status: statusMap[note.status] || 'pending' });
                                }}
                                className={`p-1 rounded flex items-center gap-1 ${note.status === 'done' ? 'bg-green-500/10 text-green-600' :
                                    note.status === 'in-progress' ? 'bg-blue-500/10 text-blue-600' :
                                        'hover:bg-black/10 text-black/40'
                                    }`}
                                title={`Status: ${note.status}`}
                            >
                                {note.status === 'done' ? <CheckCircle size={14} /> :
                                    note.status === 'in-progress' ? <Play size={14} /> :
                                        <Clock size={14} />}
                                <span className="text-[8px] font-bold uppercase">{note.status}</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <div
                                className="cursor-nwse-resize p-1 hover:bg-black/10 rounded"
                                onMouseDown={handleResizeStart}
                            >
                                <Maximize2 size={12} className="rotate-90" />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export const NoteCard = memo(NoteCardComponent);
