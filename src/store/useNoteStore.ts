import { create } from 'zustand';
import { type Note, type MarkupObject, type MarkupType } from '../db';
import { normalizeUrl } from '../utils/url';

interface NoteState {
    notes: Note[];
    activeNoteId: string | null;
    selectedMarkupId: string | null;
    isLoading: boolean;
    isSettingsLoaded: boolean;
    currentUrl: string;
    isGlobalView: boolean;
    searchQuery: string;
    mode: 'note' | 'markup' | 'capture' | 'review';
    currentTool: MarkupType | 'eraser' | 'select';
    currentColor: string;
    settings: {
        fontFamily: string;
        fontSize: number;
        textColor: string;
        showToolbar: boolean;
        isToolbarExpanded: boolean;
        penWidth: number;
        highlightWidth: number;
        markupOpacity: number;
        isCleanView: boolean;
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
    setMode: (mode: 'note' | 'markup' | 'capture' | 'review') => void;
    setTool: (tool: MarkupType | 'eraser' | 'select') => void;
    setColor: (color: string) => void;
    setOpacity: (opacity: number) => void;
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

    // Data Management
    exportData: (domain?: string) => Promise<void>;
    importData: (jsonData: string) => Promise<void>;
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
            if (!isContextValid()) return;

            if (areaName === 'local') {
                try {
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
                            set((state) => ({
                                settings: { ...state.settings, ...newValue }
                            }));
                        }
                    }
                    if (changes['pagepost_mode']) {
                        const newValue = changes['pagepost_mode'].newValue;
                        if (newValue === 'note' || newValue === 'markup' || newValue === 'capture' || newValue === 'review') {
                            set({ mode: newValue });
                        }
                    }
                } catch (e) {
                    console.error('PagePost: Error in storage change listener:', e);
                }
            }
        });

        // Supplement with message listener for immediate cross-context sync
        chrome.runtime.onMessage.addListener((message) => {
            if (!isContextValid()) return;
            if (message.type === 'SETTINGS_UPDATED') {
                set({ settings: { ...get().settings, ...message.settings } });
            }
        });
    }

    return {
        notes: [],
        activeNoteId: null,
        selectedMarkupId: null,
        isLoading: false,
        isSettingsLoaded: false,
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
            isToolbarExpanded: true,
            penWidth: 3,
            highlightWidth: 20,
            markupOpacity: 1.0,
            isCleanView: false
        },
        markups: [],
        markupFetchRequestId: 0,

        loadSettings: async () => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(SETTINGS_KEY);
                if (!isContextValid()) return;
                if (result[SETTINGS_KEY]) {
                    set({ settings: { ...get().settings, ...result[SETTINGS_KEY] }, isSettingsLoaded: true });
                } else {
                    set({ isSettingsLoaded: true });
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        },

        updateSettings: async (newSettings) => {
            if (!isContextValid()) return;
            try {
                const currentSettings = get().settings;
                const updated = { ...currentSettings, ...newSettings };
                await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
                if (!isContextValid()) return;
                set({ settings: updated });
            } catch (error) {
                console.error('Failed to update settings:', error);
            }
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),
        setMode: async (mode: 'note' | 'markup' | 'capture' | 'review') => {
            if (!isContextValid()) return;
            try {
                await chrome.storage.local.set({ 'pagepost_mode': mode });
                if (!isContextValid()) return;
                set({ mode });
            } catch (e) {
                set({ mode });
            }
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

        setOpacity: async (opacity: number) => {
            const { updateSettings, selectedMarkupId, updateMarkup, markups } = get();
            await updateSettings({ markupOpacity: opacity });

            // If a markup is selected, update it immediately
            if (selectedMarkupId) {
                const markup = markups.find(m => m.id === selectedMarkupId);
                if (markup) {
                    updateMarkup(selectedMarkupId, { style: { ...markup.style, opacity } });
                }
            }
        },

        fetchAllNotes: async () => {
            if (!isContextValid()) return;
            set({ isLoading: true, isGlobalView: true });
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid()) return;
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
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                // Filter by search query if exists (global search)
                const query = get().searchQuery.toLowerCase();
                const filteredMarkups = query
                    ? allMarkups.filter(m => m.content?.toLowerCase().includes(query))
                    : allMarkups;

                set({ markups: filteredMarkups, isLoading: false });

                // Update stats after both notes and markups are fetched
                const notesResult = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid()) return;
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

            const nextId = get().fetchRequestId + 1;
            const isNewUrl = get().currentUrl !== normalizedUrl;

            set({ fetchRequestId: nextId });

            if (isNewUrl) {
                set({ notes: [], activeNoteId: null, currentUrl: normalizedUrl, isGlobalView: false });
            }

            set({ isLoading: true });
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid() || get().fetchRequestId !== nextId) return;

                let allNotes = (result[STORAGE_KEY] || []) as Note[];
                const filteredNotes = allNotes.filter(n => normalizeUrl(n.url) === normalizedUrl);

                const query = get().searchQuery.toLowerCase();
                const processedNotes = query
                    ? filteredNotes.filter(n => n.content.toLowerCase().includes(query))
                    : filteredNotes;

                set({ notes: processedNotes, isLoading: false });
            } catch (error) {
                console.error(`PagePost: Failed to fetch notes:`, error);
                if (get().fetchRequestId === nextId) {
                    set({ isLoading: false });
                }
            }
        },

        addNote: async (note: Note) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid()) return;
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
                if (!isContextValid()) return;

                const { currentUrl, isGlobalView, notes } = get();
                const normalizedCurrentUrl = currentUrl ? normalizeUrl(currentUrl) : (typeof window !== 'undefined' ? normalizeUrl(window.location.href) : '');

                if (isGlobalView) {
                    set({ notes: [...notes, noteWithTags].sort((a, b) => b.updatedAt - a.updatedAt) });
                } else if (normalizedCurrentUrl === noteWithTags.url) {
                    set({ notes: [...notes, noteWithTags] });
                }
            } catch (error) {
                console.error('Failed to add note:', error);
            }
        },

        updateNote: async (id: string, updates: Partial<Note>) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid()) return;
                const allNotes = (result[STORAGE_KEY] || []) as Note[];

                const updatedAt = Date.now();
                const tags = updates.content ? Array.from(updates.content.matchAll(/#(\w+)/g)).map(m => m[1]) : undefined;
                const finalUpdates = tags !== undefined ? { ...updates, tags, updatedAt } : { ...updates, updatedAt };

                const updatedAllNotes = allNotes.map((n) => (n.id === id ? { ...n, ...finalUpdates } : n));
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedAllNotes });
                if (!isContextValid()) return;

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
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                if (!isContextValid()) return;
                const allNotes = (result[STORAGE_KEY] || []) as Note[];

                const updatedAllNotes = allNotes.filter((n) => n.id !== id);
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedAllNotes });
                if (!isContextValid()) return;

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
            if (!isContextValid()) return;
            try {
                if (confirm('정말로 모든 메모를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
                    if (!isContextValid()) return;
                    set({ notes: [] });
                }
            } catch (error) {
                console.error('Failed to delete all notes:', error);
            }
        },

        fetchMarkupsForUrl: async (url: string) => {
            if (!isContextValid()) return;
            const normalizedUrl = normalizeUrl(url);
            const nextId = get().markupFetchRequestId + 1;
            set({ markupFetchRequestId: nextId });

            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid() || get().markupFetchRequestId !== nextId) return;

                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];
                const filteredMarkups = allMarkups.filter(m => normalizeUrl(m.url) === normalizedUrl);

                set({ markups: filteredMarkups });
            } catch (error) {
                console.error(`PagePost: Failed to fetch markups:`, error);
            }
        },

        addMarkup: async (markup: MarkupObject) => {
            if (!isContextValid()) return;
            try {
                const normalizedUrl = normalizeUrl(markup.url);
                const markupWithUrl = { ...markup, url: normalizedUrl };

                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];
                const updatedAllMarkups = [...allMarkups, markupWithUrl];
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                if (!isContextValid()) return;

                const { currentUrl, markups } = get();
                if (currentUrl && normalizeUrl(currentUrl) === normalizedUrl) {
                    set({ markups: [...markups, markupWithUrl] });
                }
            } catch (error) {
                console.error('Failed to add markup:', error);
            }
        },

        updateMarkup: async (id: string, updates: Partial<MarkupObject>) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAt = Date.now();
                const updatedAllMarkups = allMarkups.map(m => m.id === id ? { ...m, ...updates, updatedAt } : m);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                if (!isContextValid()) return;

                const { markups } = get();
                set({ markups: markups.map(m => m.id === id ? { ...m, ...updates, updatedAt } : m) });
            } catch (error) {
                console.error('Failed to update markup:', error);
            }
        },

        deleteMarkup: async (id: string) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAllMarkups = allMarkups.filter(m => m.id !== id);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                if (!isContextValid()) return;

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
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const urlMarkups = allMarkups.filter(m => normalizeUrl(m.url) === normalizedUrl);
                if (urlMarkups.length === 0) return;

                const lastMarkupId = urlMarkups[urlMarkups.length - 1].id;
                const updatedAllMarkups = allMarkups.filter(m => m.id !== lastMarkupId);

                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                if (!isContextValid()) return;
                set({ markups: markups.filter(m => m.id !== lastMarkupId) });
            } catch (error) {
                console.error('Failed to undo markup:', error);
            }
        },

        redoMarkup: async () => {
            console.log('Redo not yet implemented');
        },

        clearAllMarkups: async () => {
            if (!isContextValid()) return;
            try {
                const { currentUrl } = get();
                if (!currentUrl) return;

                const normalizedCurrentUrl = normalizeUrl(currentUrl);
                const result = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const updatedAllMarkups = allMarkups.filter(m => normalizeUrl(m.url) !== normalizedCurrentUrl);
                await chrome.storage.local.set({ [MARKUP_STORAGE_KEY]: updatedAllMarkups });
                if (!isContextValid()) return;

                set({ markups: [] });
            } catch (error) {
                console.error('Failed to clear markups:', error);
            }
        },

        exportData: async (domain?: string) => {
            if (!isContextValid()) return;
            try {
                const notesResult = await chrome.storage.local.get(STORAGE_KEY);
                const markupsResult = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;

                let notesToExport = (notesResult[STORAGE_KEY] || []) as Note[];
                let markupsToExport = (markupsResult[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                if (domain) {
                    notesToExport = notesToExport.filter(n => n.domain === domain);
                    const urls = new Set(notesToExport.map(n => n.url));
                    markupsToExport = markupsToExport.filter(m => urls.has(m.url));
                }

                const data = {
                    version: '2.0',
                    exportDate: Date.now(),
                    notes: notesToExport,
                    markups: markupsToExport
                };

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const filename = `pagepost_export_${domain || 'all'}.json`;

                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to export data:', error);
            }
        },

        importData: async (jsonData: string) => {
            if (!isContextValid()) return;
            try {
                const data = JSON.parse(jsonData);
                const notesResult = await chrome.storage.local.get(STORAGE_KEY);
                const markupsResult = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return;

                const existingNotes = (notesResult[STORAGE_KEY] || []) as Note[];
                const existingMarkups = (markupsResult[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const incomingNotes = (data.notes || []) as Note[];
                const noteMap = new Map<string, Note>();
                existingNotes.forEach(n => noteMap.set(n.id, n));
                incomingNotes.forEach(n => noteMap.set(n.id, n));

                const incomingMarkups = (data.markups || []) as MarkupObject[];
                const markupMap = new Map<string, MarkupObject>();
                existingMarkups.forEach(m => markupMap.set(m.id, m));
                incomingMarkups.forEach(m => markupMap.set(m.id, m));

                await chrome.storage.local.set({
                    [STORAGE_KEY]: Array.from(noteMap.values()),
                    [MARKUP_STORAGE_KEY]: Array.from(markupMap.values())
                });

                if (!isContextValid()) return;
                const { currentUrl, fetchNotesForUrl, fetchMarkupsForUrl } = get();
                if (currentUrl) {
                    await fetchNotesForUrl(currentUrl);
                    await fetchMarkupsForUrl(currentUrl);
                }
            } catch (error) {
                console.error('Failed to import data:', error);
            }
        },
    };
});
