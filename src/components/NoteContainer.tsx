import React, { useEffect } from 'react';
import { NoteCard } from './NoteCard';
import { useNoteStore } from '../store/useNoteStore';
import { FloatingToolbar } from './FloatingToolbar';
import { LayoutList, ChevronRight, MessageSquare } from 'lucide-react';

const ReviewSidebar: React.FC<{ notes: any[], onNoteClick: (id: string) => void }> = ({ notes, onNoteClick }) => {
    return (
        <div className="fixed top-0 right-0 w-80 h-full bg-white/90 backdrop-blur-xl border-l border-gray-200 shadow-2xl z-[400] flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 bg-brand-primary/10 border-b border-brand-primary/20">
                <div className="flex items-center gap-3 mb-1">
                    <LayoutList className="text-brand-primary" size={24} />
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Review Mode</h2>
                </div>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Current Page: {notes.length} Notes</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {notes.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
                        <MessageSquare size={48} strokeWidth={1} className="opacity-20" />
                        <p className="text-sm font-medium">작성된 메모가 없습니다.</p>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onNoteClick(note.id)}
                            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-brand-primary hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: note.color }} />
                                <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed font-medium">
                                {note.content || <span className="italic text-gray-300">내용 없음</span>}
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex gap-1">
                                    {note.tags.slice(0, 2).map((tag: string) => (
                                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md font-bold">#{tag}</span>
                                    ))}
                                </div>
                                <ChevronRight size={14} className="text-brand-primary opacity-0 group-hover:opacity-100 transition-all translate-x-1" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-[10px] text-center text-gray-400 font-bold">리스트를 클릭하면 해당 위치로 이동합니다.</p>
            </div>
        </div>
    );
};

export const NoteContainer: React.FC = () => {
    const { notes, fetchNotesForUrl, fetchMarkupsForUrl, settings, loadSettings, isSettingsLoaded, mode, setActiveNoteId } = useNoteStore();

    useEffect(() => {
        const url = window.location.href;
        loadSettings();
        fetchNotesForUrl(url);
        fetchMarkupsForUrl(url);

        const handleBackgroundClick = (e: MouseEvent) => {
            if (e.target === document.body || (e.target as HTMLElement).id === 'pagepost-notes-root') {
                setActiveNoteId(null);
            }
        };
        window.addEventListener('mousedown', handleBackgroundClick);
        return () => window.removeEventListener('mousedown', handleBackgroundClick);
    }, [fetchNotesForUrl, fetchMarkupsForUrl, loadSettings, setActiveNoteId]);

    const handleNoteClick = (noteId: string) => {
        console.log('PagePost: Review sidebar clicked for note:', noteId);

        // Find the note element within the shadow DOM
        const host = document.getElementById('pagepost-extension-host');
        const rootContainer = host?.shadowRoot?.getElementById('pagepost-root-container');
        const noteElement = rootContainer?.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement;

        if (noteElement) {
            console.log('PagePost: Found note element, scrolling...');
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setActiveNoteId(noteId);

            // Visual feedback: brief highlight
            noteElement.style.transition = 'all 0.4s ease-out';
            noteElement.classList.add('ring-8', 'ring-brand-primary', 'scale-105', 'z-[1000]');

            setTimeout(() => {
                noteElement.classList.remove('ring-8', 'ring-brand-primary', 'scale-105', 'z-[1000]');
            }, 1500);
        } else {
            console.error('PagePost: Could not find note element in DOM. RootContainer found:', !!rootContainer);
            // Fallback: just set active
            setActiveNoteId(noteId);
        }
    };

    const isExtensionPage = typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:';

    return (
        <div id="pagepost-notes-root" className="pointer-events-none">
            {isSettingsLoaded && settings.showToolbar && mode !== 'capture' && !isExtensionPage && <FloatingToolbar />}

            {mode === 'review' && <ReviewSidebar notes={notes} onNoteClick={handleNoteClick} />}

            <div className="pointer-events-none">
                {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>
        </div>
    );
};
