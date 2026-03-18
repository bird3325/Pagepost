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
    MinusCircle,
    History,
    ChevronLeft,
    Mic,
    MicOff,
    Send,
    Loader2,
    Check
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
    const updateNote = useNoteStore(state => state.updateNote);
    const deleteNote = useNoteStore(state => state.deleteNote);
    const settings = useNoteStore(state => state.settings);
    const loadSettings = useNoteStore(state => state.loadSettings);
    const activeNoteId = useNoteStore(state => state.activeNoteId);
    const setActiveNoteId = useNoteStore(state => state.setActiveNoteId);
    const accentColor = useNoteStore(state => state.accentColor);
    const syncToExternalService = useNoteStore(state => state.syncToExternalService);
    const saveVoiceMemo = useNoteStore(state => state.saveVoiceMemo);

    const [isDraggingLocal, setIsDraggingLocal] = useState(false);
    const [isResizingLocal, setIsResizingLocal] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [showSyncMenu, setShowSyncMenu] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // --- Smart Anchoring Restoration with Retry and Layout Shift Handling ---
    useEffect(() => {
        if (!note.anchor) return;

        let retryCount = 0;
        const maxRetries = 60; // 6 seconds total (100ms * 60)
        let foundOnce = false;
        let pouncingEndsAt = 0;

        const attemptRestoration = (isFinal = false) => {
            const el = restoreElement(note.anchor!);
            if (el) {
                const rect = el.getBoundingClientRect();

                // Safety check: If the element is found but has no dimensions yet
                if (rect.width === 0 || rect.height === 0) return false;

                const newX = rect.left + window.scrollX + (note.anchor!.position.x * rect.width);
                const newY = rect.top + window.scrollY + (note.anchor!.position.y * rect.height);

                const hasMoved = Math.abs(newX - note.notePosition.x) > 1.0 || Math.abs(newY - note.notePosition.y) > 1.0;

                if (hasMoved) {
                    if (isFinal) {
                        // Permanent save to storage at the end or when definitively moved
                        updateNote(note.id, { notePosition: { x: newX, y: newY } });
                    } else {
                        // Memory-only update during "pouncing" to avoid storage thrashing/shuffling
                        useNoteStore.getState().updateNoteState(note.id, { notePosition: { x: newX, y: newY } });
                    }
                }
                return true;
            }
            return false;
        };

        const retryInterval = 100; // 0.1 second
        const timer = setInterval(() => {
            retryCount++;
            const success = attemptRestoration(false);

            if (success && !foundOnce) {
                foundOnce = true;
                // Once found, keep tracking for another 3 seconds to handle layout shifts
                pouncingEndsAt = retryCount + 30;
            }

            // End of period or max retries
            if (retryCount >= maxRetries || (foundOnce && retryCount >= pouncingEndsAt)) {
                clearInterval(timer);
                // Final sync to storage if we found it
                if (foundOnce) {
                    attemptRestoration(true);
                }
            }
        }, retryInterval);

        return () => clearInterval(timer);
    }, [note.id]);

    // --- Voice Recording Logic ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            recordChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
                saveVoiceMemo(note.id, blob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('마이크 권한이 필요합니다.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSync = async (service: 'notion' | 'slack' | 'trello') => {
        setIsSyncing(service);
        const success = await syncToExternalService(note.id, service);
        setIsSyncing(null);
        if (success) {
            setShowSyncMenu(false);
        }
    };
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
        setIsDraggingLocal(true);

        const handleMouseMove = (ev: MouseEvent) => {
            if (!interactionRef.current.isDragging) return;

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const dx = ev.clientX - interactionRef.current.startX;
                const dy = ev.clientY - interactionRef.current.startY;

                if (cardRef.current) {
                    cardRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
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

            if (cardRef.current) {
                cardRef.current.style.transform = 'none';
                cardRef.current.style.left = `${finalX}px`;
                cardRef.current.style.top = `${finalY}px`;
            }
            setIsDraggingLocal(false);

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
        setIsResizingLocal(true);

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

            setIsResizingLocal(false);

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
            className={`absolute rounded-lg shadow-lg border border-black/5 overflow-hidden flex flex-col pointer-events-auto transition-[opacity,transform,filter,ring-width] duration-300 ${currentColorClass} ${note.isCollapsed ? 'w-10 h-10' : ''} ${activeNoteId === note.id ? 'ring-2 ring-brand-primary' : ''} ${settings.isCleanView && !isHovered ? 'scale-95' : 'scale-100'} ${(isDraggingLocal || isResizingLocal) ? '!transition-none !duration-0' : ''}`}
            style={{
                left: note.notePosition.x,
                top: note.notePosition.y,
                width: note.isCollapsed ? undefined : note.size.width,
                height: note.isCollapsed ? undefined : note.size.height,
                zIndex: activeNoteId === note.id ? 201 : 200,
                border: activeNoteId === note.id ? `3px solid ${accentColor}` : '1px solid rgba(0,0,0,0.1)',
                boxShadow: activeNoteId === note.id ? `0 12px 40px rgba(0,0,0,0.15), 0 0 20px ${accentColor}33` : '0 8px 30px rgba(0,0,0,0.12)',
                opacity: settings.isCleanView
                    ? (isHovered ? 1.0 : settings.cleanViewOpacity)
                    : (note.status === 'done' ? 0.6 : 1.0),
                filter: settings.isCleanView && !isHovered ? 'grayscale(100%) blur(2px)' : 'none',
                willChange: (isDraggingLocal || isResizingLocal) ? 'transform, left, top' : 'auto'
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
            {!note.isCollapsed && (note.assignee || note.audioUrl || note.integrations?.syncedAt) && (
                <div className="px-3 py-1 bg-black/5 flex items-center justify-between border-b border-black/5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {note.assignee && (
                            <>
                                <User size={10} className="text-black/40" />
                                <span className="text-[9px] font-bold text-black/60 uppercase tracking-tighter truncate">
                                    {note.assignee}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {note.audioUrl && (
                            <div className="flex items-center gap-1 animate-pulse">
                                <Mic size={10} className="text-brand-primary" />
                                <span className="text-[8px] font-bold text-brand-primary uppercase">VOICE</span>
                            </div>
                        )}
                        {note.integrations?.syncedAt && (
                            <div className="flex gap-0.5">
                                {note.integrations.notionId && <div className="w-1.5 h-1.5 rounded-full bg-slate-800" title="Synced to Notion" />}
                                {note.integrations.slackTs && <div className="w-1.5 h-1.5 rounded-full bg-[#4A154B]" title="Synced to Slack" />}
                                {note.integrations.trelloId && <div className="w-1.5 h-1.5 rounded-full bg-[#0079BF]" title="Synced to Trello" />}
                            </div>
                        )}
                    </div>
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
                            {note.history && note.history.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                                    className="p-1 rounded text-white shadow-sm transition-colors"
                                    style={{ backgroundColor: accentColor }}
                                    title="수정 히스토리"
                                >
                                    <History size={12} />
                                </button>
                            )}
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
                                        <MinusCircle size={14} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-1">
                            {/* Voice Memo Button */}
                            <button
                                onClick={() => isRecording ? stopRecording() : startRecording()}
                                className={`p-1 rounded transition-all duration-300 relative ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-black/10 text-black/40'}`}
                                title={isRecording ? `녹음 중... (${recordingTime}s)` : "음성 메모 추가"}
                            >
                                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                                {note.audioUrl && !isRecording && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-primary rounded-full border border-white" />
                                )}
                            </button>

                            {/* Workflow Bridge Sync Button */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSyncMenu(!showSyncMenu)}
                                    className={`p-1 rounded transition-all ${showSyncMenu ? 'bg-black/10 text-brand-primary' : 'hover:bg-black/10 text-black/40'}`}
                                    title="외부 서비스 전송"
                                >
                                    <Send size={14} />
                                </button>

                                {showSyncMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-xl shadow-2xl border border-black/10 overflow-hidden z-[300] animate-in slide-in-from-bottom-2 duration-200">
                                        <div className="p-2 bg-slate-50 border-b border-black/5 text-[8px] font-black uppercase text-slate-400 tracking-widest text-center">
                                            Sync To
                                        </div>
                                        <div className="p-1 space-y-0.5">
                                            {[
                                                { id: 'notion', label: 'Notion', color: 'hover:bg-slate-100', icon: 'N', synced: !!note.integrations?.notionId },
                                                { id: 'slack', label: 'Slack', color: 'hover:bg-purple-50', icon: '#', synced: !!note.integrations?.slackTs },
                                                { id: 'trello', label: 'Trello', color: 'hover:bg-blue-50', icon: 'T', synced: !!note.integrations?.trelloId }
                                            ].map(svc => (
                                                <button
                                                    key={svc.id}
                                                    disabled={!!isSyncing}
                                                    onClick={() => handleSync(svc.id as any)}
                                                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${svc.color} ${isSyncing === svc.id ? 'opacity-50' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-4 text-center opacity-40">{svc.icon}</span>
                                                        <span>{svc.label}</span>
                                                    </div>
                                                    {isSyncing === svc.id ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : svc.synced ? (
                                                        <Check size={10} className="text-green-500" />
                                                    ) : null}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div
                                className="cursor-nwse-resize p-1 hover:bg-black/10 rounded"
                                onMouseDown={handleResizeStart}
                            >
                                <Maximize2 size={12} className="rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* History Overlay for NoteCard */}
                    {showHistory && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[250] flex flex-col animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 p-2 border-b border-black/5 bg-black/5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowHistory(false); }}
                                    className="p-1 hover:bg-black/10 rounded"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-black uppercase tracking-tight">Revision History</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-3">
                                {note.history?.map((entry, idx) => (
                                    <div key={idx} className="border-l-2 pl-2 py-0.5" style={{ borderColor: accentColor }}>
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[8px] font-bold text-black/40 uppercase">
                                                {idx === 0 ? 'Last Version' : `V${note.history!.length - idx}`}
                                            </span>
                                            <span className="text-[8px] text-black/30">
                                                {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-black/70 leading-tight italic line-clamp-3">
                                            {entry.content}
                                        </p>
                                    </div>
                                ))}
                                <div className="border-l-2 border-green-500 pl-2 py-0.5">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[8px] font-bold text-green-600 uppercase">Current</span>
                                    </div>
                                    <p className="text-[10px] text-black/80 leading-tight font-medium">
                                        {note.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export const NoteCard = memo(NoteCardComponent);
