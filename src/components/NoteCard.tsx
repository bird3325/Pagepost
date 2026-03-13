import React, { useState, useRef, useEffect } from 'react';
import { type Note } from '../db';
import { useNoteStore } from '../store/useNoteStore';
import {
    Pin,
    CheckCircle,
    Palette,
    ChevronUp,
    ChevronDown,
    GripHorizontal,
    X,
    Maximize2
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

export const NoteCard: React.FC<NoteCardProps> = ({ note }) => {
    const { updateNote, deleteNote, settings, loadSettings, activeNoteId } = useNoteStore();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);
    const [showColors, setShowColors] = useState(false);
    const [localContent, setLocalContent] = useState(note.content);

    const cardRef = useRef<HTMLDivElement>(null);
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
            const dx = ev.clientX - interactionRef.current.startX;
            const dy = ev.clientY - interactionRef.current.startY;

            try {
                updateNote(note.id, {
                    notePosition: {
                        x: interactionRef.current.initialX + dx,
                        y: interactionRef.current.initialY + dy
                    }
                });
            } catch (e) {
                // Extension context invalidated
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                interactionRef.current.isDragging = false;
            }
        };

        const handleMouseUp = () => {
            interactionRef.current.isDragging = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
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
            const dx = ev.clientX - interactionRef.current.startX;
            const dy = ev.clientY - interactionRef.current.startY;

            try {
                updateNote(note.id, {
                    size: {
                        width: Math.max(150, interactionRef.current.initialW + dx),
                        height: Math.max(100, interactionRef.current.initialH + dy)
                    }
                });
            } catch (e) {
                // Extension context invalidated
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                interactionRef.current.isResizing = false;
            }
        };

        const handleMouseUp = () => {
            interactionRef.current.isResizing = false;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const currentColorClass = COLORS.find(c => c.hex === note.color)?.class || 'bg-note-yellow';

    return (
        <div
            ref={cardRef}
            className={`absolute transition-all duration-200 rounded-lg shadow-lg border border-black/5 overflow-hidden flex flex-col pointer-events-auto ${currentColorClass} ${note.isCollapsed ? 'w-10 h-10' : ''} ${activeNoteId === note.id ? 'ring-2 ring-brand-primary' : ''}`}
            style={{
                left: note.notePosition.x,
                top: note.notePosition.y,
                width: note.isCollapsed ? undefined : note.size.width,
                height: note.isCollapsed ? undefined : note.size.height,
                zIndex: 2147483647,
                opacity: note.status === 'done' ? 0.6 : 0.95,
            }}
        >
            {/* Header / Drag Area */}
            <div
                className="h-8 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing border-b border-black/5 flex-shrink-0"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-1">
                    <GripHorizontal size={14} className="text-black/30" />
                    {note.isPinned && <Pin size={12} className="text-red-500 fill-current" />}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); updateNote(note.id, { isCollapsed: !note.isCollapsed }); }}
                        className="p-1 hover:bg-black/10 rounded transition-colors"
                    >
                        {note.isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        className="p-1 hover:bg-black/10 rounded text-red-500 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {!note.isCollapsed && (
                <>
                    {/* Content Area */}
                    <div className="flex-1 p-3 overflow-hidden">
                        {isEditing ? (
                            <textarea
                                autoFocus
                                className="w-full h-full bg-transparent resize-none border-none outline-none text-sm leading-relaxed"
                                style={{
                                    fontFamily: settings.fontFamily,
                                    fontSize: `${settings.fontSize}px`,
                                    color: settings.textColor
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
                                    fontFamily: settings.fontFamily,
                                    fontSize: `${settings.fontSize}px`,
                                    color: settings.textColor
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
                                onClick={() => updateNote(note.id, { status: note.status === 'done' ? 'active' : 'done' })}
                                className={`p-1 rounded ${note.status === 'done' ? 'bg-black/10 text-green-600' : 'hover:bg-black/10'}`}
                                title="완료 처리"
                            >
                                <CheckCircle size={14} />
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="mr-1">{new Date(note.updatedAt).toLocaleDateString()}</span>
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
