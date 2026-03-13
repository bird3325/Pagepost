import { create } from 'zustand';
import { type Note } from '../db';
import { normalizeUrl } from '../utils/url';

interface NoteState {
    notes: Note[];
    activeNoteId: string | null;
    isLoading: boolean;
    currentUrl: string;
    isGlobalView: boolean;
    searchQuery: string;
    settings: {
        fontFamily: string;
        fontSize: number;
        textColor: string;
    };
    fetchRequestId: number;


    // Actions
    fetchAllNotes: () => Promise<void>;
    fetchNotesForUrl: (url: string) => Promise<void>;
    addNote: (note: Note) => Promise<void>;
    updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    deleteAllNotes: () => Promise<void>;
    setActiveNoteId: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    updateSettings: (settings: Partial<NoteState['settings']>) => Promise<void>;
    loadSettings: () => Promise<void>;
}

const STORAGE_KEY = 'pagepost_notes';
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
                if (changes[SETTINGS_KEY]) {
                    get().loadSettings();
                }
            }
        });
    }

    return {
        notes: [],
        activeNoteId: null,
        isLoading: false,
        currentUrl: '',
        isGlobalView: false,
        searchQuery: '',
        fetchRequestId: 0,

        settings: {
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            fontSize: 14,
            textColor: '#1a1a1a'
        },

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
            } catch (error) {
                console.error('Failed to update settings:', error);
            }
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),

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

        setActiveNoteId: (id: string | null) => set({ activeNoteId: id }),
    };
});
