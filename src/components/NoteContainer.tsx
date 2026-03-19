import React, { useEffect } from 'react';
import { NoteCard } from './NoteCard';
import { useNoteStore } from '../store/useNoteStore';
import { FloatingToolbar } from './FloatingToolbar';
import { LayoutList, ChevronRight, MessageSquare, History, Search, CheckCircle2, X, Share2, Globe, Lock } from 'lucide-react';

const ReviewSidebar: React.FC<{ notes: any[], onNoteClick: (id: string) => void }> = ({ notes, onNoteClick }) => {
    const [expandedHistoryId, setExpandedHistoryId] = React.useState<string | null>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState<string>('all');
    const [isSharing, setIsSharing] = React.useState(false);
    const { accentColor, setMode, shareSnapshot, toggleNoteSharing } = useNoteStore();

    const handleShareSnapshot = async () => {
        setIsSharing(true);
        try {
            const link = await shareSnapshot();
            await navigator.clipboard.writeText(link);
            alert('인터랙티브 스냅샷 링크가 복사되었습니다!\n이제 누구에게나 공유하여 설치 없이 웹에서 확인하게 할 수 있습니다.');
        } catch (err) {
            console.error('Failed to share:', err);
        } finally {
            setIsSharing(false);
        }
    };

    const filteredNotes = notes.filter(note => {
        const matchesSearch = (note.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (note.tags || []).some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || note.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleMouseEnter = (noteId: string) => {
        const host = document.getElementById('pagepost-extension-host');
        const rootContainer = host?.shadowRoot?.getElementById('pagepost-root-container');
        const noteElement = rootContainer?.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement;
        if (noteElement) {
            noteElement.style.boxShadow = `0 0 0 4px ${accentColor}80`;
            noteElement.style.transform = 'scale(1.05)';
            noteElement.style.zIndex = '500';
            noteElement.style.transition = 'all 0.2s ease-out';
        }
    };

    const handleMouseLeave = (noteId: string) => {
        const host = document.getElementById('pagepost-extension-host');
        const rootContainer = host?.shadowRoot?.getElementById('pagepost-root-container');
        const noteElement = rootContainer?.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement;
        if (noteElement) {
            noteElement.style.boxShadow = '';
            noteElement.style.transform = '';
            noteElement.style.zIndex = '';
        }
    };

    return (
        <div
            id="pagepost-review-sidebar"
            className="fixed top-2 right-2 w-72 h-[calc(100%-1rem)] bg-white/80 backdrop-blur-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col pointer-events-auto animate-in slide-in-from-right duration-500 rounded-3xl overflow-hidden"
            style={{ zIndex: 2147483647 }}
        >
            <div className="p-5 border-b border-gray-100/50 bg-gradient-to-b from-white/40 to-transparent">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-primary/10 rounded-2xl shadow-inner">
                            <LayoutList className="text-brand-primary" size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-gray-900 tracking-tight leading-none">Review</h2>
                            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-brand-primary animate-pulse" />
                                {filteredNotes.length} Insights
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleShareSnapshot}
                            disabled={isSharing}
                            className={`p-2 rounded-xl transition-all duration-300 group/share ${isSharing ? 'bg-brand-primary/20 text-brand-primary cursor-wait' : 'text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10'}`}
                            title="전체 페이지 스냅샷 공유"
                        >
                            <Share2 size={18} className={isSharing ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setMode('note')}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 rounded-xl transition-all duration-300 group/close"
                        >
                            <X size={18} className="transition-transform group-hover/close:rotate-90" />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Search Bar - Sophisticated treatment */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-all duration-300" size={14} />
                        <input
                            type="text"
                            placeholder="Deep search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-transparent rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white focus:border-brand-primary/10 transition-all duration-300 placeholder:text-gray-300 shadow-sm"
                        />
                    </div>

                    {/* Status Filters - Minimalist segmented control style */}
                    <div className="flex p-1 bg-gray-100/50 rounded-xl gap-1 border border-white/50 shadow-inner">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'pending', label: 'Todo' },
                            { id: 'in-progress', label: 'Doing' },
                            { id: 'done', label: 'Done' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setStatusFilter(filter.id)}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all duration-300 ${statusFilter === filter.id
                                    ? 'bg-white text-gray-900 shadow-sm scale-[1.02]'
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/30'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-2">
                {filteredNotes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-40 py-20">
                        <div className="p-8 bg-gray-50 rounded-full shadow-inner">
                            <MessageSquare size={40} strokeWidth={1} />
                        </div>
                        <p className="text-xs font-bold tracking-tight">No elements matched your filter.</p>
                    </div>
                ) : (
                    filteredNotes.map((note) => (
                        <div
                            key={note.id}
                            onClick={() => onNoteClick(note.id)}
                            onMouseEnter={() => handleMouseEnter(note.id)}
                            onMouseLeave={() => handleMouseLeave(note.id)}
                            className="p-4 bg-white/40 hover:bg-white border border-transparent hover:border-brand-primary/10 rounded-2xl transition-all duration-300 cursor-pointer group relative shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                        >
                            {/* Status Accent Left */}
                            <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full transition-all duration-300 group-hover:h-1/2 ${note.status === 'done' ? 'bg-emerald-400' :
                                note.status === 'in-progress' ? 'bg-sky-400' : 'bg-brand-primary'
                                }`} />

                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: note.color }} />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-all duration-300">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleNoteSharing(note.id);
                                        }}
                                        className={`p-1.5 rounded-lg transition-all duration-300 ${note.isShared ? 'bg-emerald-50 text-emerald-500' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}
                                        title={note.isShared ? "공개됨 (클릭하여 비공개)" : "나만 보기 (클릭하여 공유)"}
                                    >
                                        {note.isShared ? <Globe size={13} /> : <Lock size={13} />}
                                    </button>

                                    {note.history && note.history.length > 0 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedHistoryId(expandedHistoryId === note.id ? null : note.id);
                                            }}
                                            className={`p-1.5 rounded-lg transition-all duration-300 ${expandedHistoryId === note.id ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                                        >
                                            <History size={12} />
                                        </button>
                                    )}
                                    {note.status === 'done' ? (
                                        <CheckCircle2 size={14} className="text-emerald-500 drop-shadow-sm" />
                                    ) : (
                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />
                                    )}
                                </div>
                            </div>

                            <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed font-semibold mb-3 tracking-tight">
                                {note.content || <span className="italic text-gray-300 font-normal">Untitled insight</span>}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-1.5 overflow-hidden">
                                    {(note.tags || []).slice(0, 2).map((tag: string) => (
                                        <span key={tag} className="text-[8px] px-2 py-0.5 bg-gray-100/50 text-gray-500 rounded-md font-black uppercase tracking-tighter border border-gray-200/20">#{tag}</span>
                                    ))}
                                </div>
                                <div className="p-1.5 rounded-xl bg-brand-primary/5 text-brand-primary opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 shadow-sm border border-brand-primary/10">
                                    <ChevronRight size={14} strokeWidth={3} />
                                </div>
                            </div>

                            {/* History Disclosure */}
                            {expandedHistoryId === note.id && note.history && (
                                <div className="mt-4 pt-4 border-t border-gray-100/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                        {note.history.slice(-3).reverse().map((entry: any, i: number) => (
                                            <div key={i} className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 shadow-inner">
                                                <p className="text-[10px] text-gray-500 leading-snug font-medium italic">"{entry.content}"</p>
                                                <div className="flex justify-between items-center mt-2 px-1">
                                                    <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest leading-none">
                                                        {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-gradient-to-t from-white to-transparent">
                <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white shadow-xl border border-gray-100 rounded-2xl group hover:scale-[1.02] transition-all duration-500">
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]" />
                    <p className="text-[10px] text-gray-500 font-bold tracking-tight">Intuitive visual pairing enabled</p>
                </div>
            </div>
        </div>
    );
};

export const NoteContainer: React.FC = () => {
    const { notes, fetchNotesForUrl, fetchMarkupsForUrl, settings, loadSettings, mode, setActiveNoteId } = useNoteStore();

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
            noteElement.classList.add('ring-8', 'ring-brand-primary', 'scale-105');

            setTimeout(() => {
                noteElement.classList.remove('ring-8', 'ring-brand-primary', 'scale-105');
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
            {settings.showToolbar && mode !== 'capture' && !isExtensionPage && <FloatingToolbar />}

            {/* Explicit stacking context for notes to keep them below the sidebar */}
            <div className="pointer-events-none" style={{ position: 'relative', zIndex: 100 }}>
                {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>

            {mode === 'review' && <ReviewSidebar notes={notes} onNoteClick={handleNoteClick} />}
        </div>
    );
};
