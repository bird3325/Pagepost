import { create } from 'zustand';
import { type Note, type MarkupObject, type MarkupType } from '../db';
import { normalizeUrl } from '../utils/url';

interface NoteState {
    notes: Note[];
    activeNoteId: string | null;
    selectedMarkupId: string | null;
    isLoading: boolean;
    currentUrl: string;
    isGlobalView: boolean;
    searchQuery: string;
    mode: 'note' | 'markup' | 'capture';
    currentTool: MarkupType | 'eraser' | 'select';
    currentColor: string;
    settings: {
        fontFamily: string;
        fontSize: number;
        textColor: string;
        showToolbar: boolean;
        penWidth: number;
        highlightWidth: number;
    };
    markups: MarkupObject[];
    fetchRequestId: number;
    markupFetchRequestId: number;


    // Actions
    stats: {
        totalNotes: number;
        totalMarkups: number;
        domainCount: number;
    };
    fetchAllNotes: () => Promise<void>;
    fetchAllMarkups: () => Promise<void>;
    fetchNotesForUrl: (url: string) => Promise<void>;
    addNote: (note: Note) => Promise<void>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    updateNoteState: (id: string, updates: Partial<Note>) => void;
    deleteNote: (id: string) => Promise<void>;
    deleteAllNotes: () => Promise<void>;
    setActiveNoteId: (id: string | null) => void;
    setSelectedMarkupId: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    setMode: (mode: 'note' | 'markup' | 'capture') => void;
    setTool: (tool: MarkupType | 'eraser' | 'select') => void;
    setColor: (color: string) => void;
    updateSettings: (settings: Partial<NoteState['settings']>) => Promise<void>;
    loadSettings: () => Promise<void>;

    // Markup Actions
    fetchMarkupsForUrl: (url: string) => Promise<void>;
    addMarkup: (markup: MarkupObject) => Promise<void>;
    updateMarkup: (id: string, updates: Partial<MarkupObject>) => Promise<void>;
    deleteMarkup: (id: string) => Promise<void>;
    undoMarkup: () => Promise<void>;
    redoMarkup: () => Promise<void>;
    clearAllMarkups: () => Promise<void>;
}

const STORAGE_KEY = 'pagepost_notes';
const MARKUP_STORAGE_KEY = 'pagepost_markups';
const SETTINGS_KEY = 'pagepost_settings';

const isContextValid = () => {
    try {
        return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
        return false;
    }
};

export const useNoteStore = create<NoteState>((set, get) => {
    // Listen for storage changes
    if (isContextValid()) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                if (changes[STORAGE_KEY]) {
                    const { currentUrl, isGlobalView, fetchNotesForUrl, fetchAllNotes } = get();
                    const targetUrl = currentUrl || (typeof window !== 'undefined' ? normalizeUrl(window.location.href) : '');

                    if (isGlobalView) fetchAllNotes();
                    else if (targetUrl) fetchNotesForUrl(targetUrl);
                }
                if (changes[MARKUP_STORAGE_KEY]) {
                    const { currentUrl, fetchMarkupsForUrl } = get();
                    const targetUrl = currentUrl || (typeof window !== 'undefined' ? normalizeUrl(window.location.href) : '');
                    if (targetUrl) fetchMarkupsForUrl(targetUrl);
                }
                if (changes[SETTINGS_KEY]) {
                    const { newValue } = changes[SETTINGS_KEY];
                    if (newValue) {
                        console.log('PagePost: Settings updated - showToolbar:', (newValue as any).showToolbar);
                        set((state) => ({
                            settings: { ...state.settings, ...newValue }
                        }));
                    }
                }
                if (changes['pagepost_mode']) {
                    const newValue = changes['pagepost_mode'].newValue;
                    if (newValue === 'note' || newValue === 'markup' || newValue === 'capture') {
                        set({ mode: newValue });
                    }
                }
            }
        });

        // Supplement with message listener for immediate cross-context sync
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'SETTINGS_UPDATED') {
                console.log('PagePost: Received direct settings update:', message.settings);
                set({ settings: { ...get().settings, ...message.settings } });
            }
        });
    }

    return {
        notes: [],
        activeNoteId: null,
        selectedMarkupId: null,
        isLoading: false,
        currentUrl: '',
        isGlobalView: false,
        searchQuery: '',
        stats: {
            totalNotes: 0,
            totalMarkups: 0,
            domainCount: 0
        },
        mode: 'note',
        currentTool: 'pen',
        currentColor: '#3b82f6',
        fetchRequestId: 0,

        settings: {
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            fontSize: 14,
            textColor: '#1a1a1a',
            showToolbar: true,
            penWidth: 3,
            highlightWidth: 20
        },
        markups: [],
        markupFetchRequestId: 0,

        loadSettings: async () => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(SETTINGS_KEY);
                if (result[SETTINGS_KEY]) {
                    set({ settings: { ...get().settings, ...result[SETTINGS_KEY] } });
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        },

        updateSettings: async (newSettings) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const currentSettings = get().settings;
                const updated = { ...currentSettings, ...newSettings };
                await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
                set({ settings: updated });

                // Broadcast to all tabs for immediate synchronization
                if (isContextValid() && typeof chrome.tabs !== 'undefined') {
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach(tab => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', settings: updated }).catch(() => { });
                            }
                        });
                    });
                }
            } catch (error) {
                console.error('Failed to update settings:', error);
            }
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),
        setMode: async (mode: 'note' | 'markup' | 'capture') => {
            if (isContextValid()) {
                await chrome.storage.local.set({ 'pagepost_mode': mode });
            }
            set({ mode });
        },
        setActiveNoteId: (id) => set({ activeNoteId: id, selectedMarkupId: null }),
        setSelectedMarkupId: (id) => set({ selectedMarkupId: id }),
        setTool: (tool) => set({ currentTool: tool, selectedMarkupId: tool === 'select' ? get().selectedMarkupId : null }),
        setColor: (color: string) => {
            set({ currentColor: color });
            // If a markup is selected, update it immediately
            const { selectedMarkupId, updateMarkup, markups } = get();
            if (selectedMarkupId) {
                const markup = markups.find(m => m.id === selectedMarkupId);
                if (markup) {
                    updateMarkup(selectedMarkupId, { style: { ...markup.style, strokeColor: color } });
                }
            }
        },

        fetchAllNotes: async () => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            set({ isLoading: true, isGlobalView: true });
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                let allNotes = (result[STORAGE_KEY] || []) as Note[];

                // Filter by search query if exists
                const query = get().searchQuery.toLowerCase();
                if (query) {
                    allNotes = allNotes.filter(n =>
                        n.content.toLowerCase().includes(query) ||
                        n.domain.toLowerCase().includes(query) ||
                        n.tags.some(t => t.toLowerCase().includes(query))
                    );
                }

                const sortedNotes = allNotes.sort((a, b) => b.updatedAt - a.updatedAt);
                set({ notes: sortedNotes, isLoading: false });
            } catch (error) {
                console.error('Failed to fetch all notes:', error);
                set({ isLoading: false });
            }
        },

        fetchAllMarkups: async () => {
            if (!isContextValid()) return;
            set({ isLoading: true });
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                // Filter by search query if exists (global search)
                const query = get().searchQuery.toLowerCase();
                const filteredMarkups = query
                    ? allMarkups.filter(m => m.content?.toLowerCase().includes(query))
                    : allMarkups;

                set({ markups: filteredMarkups, isLoading: false });

                // Update stats after both notes and markups are fetched
                const notesResult = await chrome.storage.local.get(STORAGE_KEY);
                const allNotes = (notesResult[STORAGE_KEY] || []) as Note[];
                const domains = new Set(allNotes.map(n => n.domain));

                set({
                    stats: {
                        totalNotes: allNotes.length,
                        totalMarkups: allMarkups.length,
                        domainCount: domains.size
                    }
                });
            } catch (error) {
                console.error('Failed to fetch all markups:', error);
                set({ isLoading: false });
            }
        },

        fetchNotesForUrl: async (url: string) => {
            if (!isContextValid()) return;
            const normalizedUrl = normalizeUrl(url);

            // Increment request ID to track the latest navigation
            const nextId = get().fetchRequestId + 1;
            set({ fetchRequestId: nextId });

            console.log(`PagePost: Fetching notes for URL [ReqID:${nextId}]:`, normalizedUrl);

            // Clear existing notes and set loading state immediately
            set({ notes: [], activeNoteId: null, isLoading: true, currentUrl: normalizedUrl, isGlobalView: false });
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);

                // If a newer request has started, discard this one
                if (get().fetchRequestId !== nextId) {
                    console.log(`PagePost: Discarding outdated fetch [ReqID:${nextId}]`);
                    return;
                }

                let allNotes = (result[STORAGE_KEY] || []) as Note[];

                // Ensure strict comparison by normalizing stored URLs too
                const filteredNotes = allNotes.filter(n => normalizeUrl(n.url) === normalizedUrl);
                console.log(`PagePost: Found ${filteredNotes.length} notes for this URL [ReqID:${nextId}]`);

                // Filter by search query if exists
                const query = get().searchQuery.toLowerCase();
                const processedNotes = query
                    ? filteredNotes.filter(n => n.content.toLowerCase().includes(query))
                    : filteredNotes;

                set({ notes: processedNotes, isLoading: false });
            } catch (error) {
                console.error(`PagePost: Failed to fetch notes [ReqID:${nextId}]:`, error);
                if (get().fetchRequestId === nextId) {
                    set({ isLoading: false });
                }
            }
        },



        addNote: async (note: Note) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                const allNotes = (result[STORAGE_KEY] || []) as Note[];

                const normalizedUrl = normalizeUrl(note.url);
                const tags = note.content ? Array.from(note.content.matchAll(/#(\w+)/g)).map(m => m[1]) : [];
                const noteWithTags = {
                    ...note,
                    url: normalizedUrl,
                    tags: [...new Set([...note.tags, ...tags])]
                };

                const updatedAllNotes = [...allNotes, noteWithTags];
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedAllNotes });

                // Update local state immediately for responsiveness
                const { currentUrl, isGlobalView, notes } = get();
                const normalizedCurrentUrl = currentUrl ? normalizeUrl(currentUrl) : (typeof window !== 'undefined' ? normalizeUrl(window.location.href) : '');

                if (isGlobalView) {
                    set({ notes: [...notes, noteWithTags].sort((a, b) => b.updatedAt - a.updatedAt) });
                } else if (normalizedCurrentUrl === noteWithTags.url) {
                    // noteWithTags.url is already normalized above
                    set({ notes: [...notes, noteWithTags] });
                }
            } catch (error) {
                console.error('Failed to add note:', error);
            }
        },

        updateNote: async (id: string, updates: Partial<Note>) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                const allNotes = (result[STORAGE_KEY] || []) as Note[];

                const updatedAt = Date.now();
                const tags = updates.content ? Array.from(updates.content.matchAll(/#(\w+)/g)).map(m => m[1]) : undefined;
                const finalUpdates = tags !== undefined ? { ...updates, tags, updatedAt } : { ...updates, updatedAt };

                const updatedAllNotes = allNotes.map((n) => (n.id === id ? { ...n, ...finalUpdates } : n));
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedAllNotes });

                // Update local state immediately
                const { notes } = get();
                set({ notes: notes.map((n) => (n.id === id ? { ...n, ...finalUpdates } : n)) });
            } catch (error) {
                console.error('Failed to update note:', error);
            }
        },

        updateNoteState: (id: string, updates: Partial<Note>) => {
            set((state) => ({
                notes: state.notes.map(n => n.id === id ? { ...n, ...updates } : n)
            }));
        },

        deleteNote: async (id: string) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                const allNotes = (result[STORAGE_KEY] || []) as Note[];

                const updatedAllNotes = allNotes.filter((n) => n.id !== id);
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedAllNotes });

                // Update local state immediately
                const { notes } = get();
                set((state) => ({
                    notes: notes.filter((n) => n.id !== id),
                    activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
                }));
            } catch (error) {
                console.error('Failed to delete note:', error);
            }
        },

        deleteAllNotes: async () => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                if (confirm('정말로 모든 메모를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
                    set({ notes: [] });
                }
            } catch (error) {
                console.error('Failed to delete all notes:', error);
            }
        },


        // Markup Implementation
        fetchMarkupsForUrl: async (url: string) => {
            if (!isContextValid()) return;
            const normalizedUrl = normalizeUrl(url);
            const nextId = get().markupFetchRequestId + 1;
            set({ markupFetchRequestId: nextId });

            console.log(`PagePost: Fetching markups for URL [ReqID:${nextId}]:`, normalizedUrl);
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (get().markupFetchRequestId !== nextId) return;

                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];
                const filteredMarkups = allMarkups.filter(m => normalizeUrl(m.url) === normalizedUrl);

                set({ markups: filteredMarkups });
            } catch (error) {
                console.error(`PagePost: Failed to fetch markups [ReqID:${nextId}]:`, error);
            }
        },

        addMarkup: async (markup: MarkupObject) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const normalizedUrl = normalizeUrl(markup.url);
                const markupWithUrl = { ...markup, url: normalizedUrl };

                // 1. Persist to storage
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];
                const updatedAllMarkups = [...allMarkups, markupWithUrl];
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });

                // Update local state and history
                const { currentUrl, markups } = get();
                if (currentUrl && normalizeUrl(currentUrl) === normalizedUrl) {
                    set({ markups: [...markups, markupWithUrl] });
                }
            } catch (error) {
                console.error('Failed to add markup:', error);
            }
        },

        updateMarkup: async (id: string, updates: Partial<MarkupObject>) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAt = Date.now();
                const updatedAllMarkups = allMarkups.map(m => m.id === id ? { ...m, ...updates, updatedAt } : m);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });

                // Update local state
                const { markups } = get();
                set({ markups: markups.map(m => m.id === id ? { ...m, ...updates, updatedAt } : m) });
            } catch (error) {
                console.error('Failed to update markup:', error);
            }
        },

        deleteMarkup: async (id: string) => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAllMarkups = allMarkups.filter(m => m.id !== id);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });

                // Update local state
                const { markups } = get();
                set({ markups: markups.filter(m => m.id !== id) });
            } catch (error) {
                console.error('Failed to delete markup:', error);
            }
        },

        undoMarkup: async () => {
            if (!isContextValid()) return;
            const { markups, currentUrl } = get();
            if (markups.length === 0 || !currentUrl) return;

            try {
                const normalizedUrl = normalizeUrl(currentUrl);
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                // Find markups for current URL and remove the last one added
                const urlMarkups = allMarkups.filter(m => normalizeUrl(m.url) === normalizedUrl);
                if (urlMarkups.length === 0) return;

                const lastMarkupId = urlMarkups[urlMarkups.length - 1].id;
                const updatedAllMarkups = allMarkups.filter(m => m.id !== lastMarkupId);

                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                set({ markups: markups.filter(m => m.id !== lastMarkupId) });
            } catch (error) {
                console.error('Failed to undo markup:', error);
            }
        },

        redoMarkup: async () => {
            // REDO is complex with persistent storage unless we have a trash/history table.
            // For now, focusing on UNDO as it's the most requested per-session feature.
            console.log('Redo not yet implemented for persistent storage');
        },

        clearAllMarkups: async () => {
            if (!isContextValid()) throw new Error('Extension context invalidated');
            try {
                const { currentUrl } = get();
                if (!currentUrl) return;

                const normalizedCurrentUrl = normalizeUrl(currentUrl);
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAllMarkups = allMarkups.filter(m => normalizeUrl(m.url) !== normalizedCurrentUrl);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });

                set({ markups: [] });
            } catch (error) {
                console.error('Failed to clear markups:', error);
            }
        },
    };
});
