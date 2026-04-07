import { create } from 'zustand';
import { type Note, type MarkupObject, type MarkupType, type Project } from '../db';
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
    dashboardViewMode: 'list' | 'canvas';
    mode: 'note' | 'markup' | 'capture' | 'review';
    currentTool: MarkupType | 'eraser' | 'select';
    currentColor: string;
    // ... rest
    setDashboardViewMode: (mode: 'list' | 'canvas') => void;
    updateCanvasPosition: (noteId: string, position: { x: number, y: number }) => Promise<void>;
    moveNoteToProject: (noteId: string, projectId: string | null) => Promise<void>;
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
        cleanViewOpacity: number;
        toolbarPosition: { x: number; y: number };
        toolbarOpacity: number;
        showMiniMap: boolean;
        apiKeys?: {
            notionToken?: string;
            notionDatabaseId?: string;
            slackWebhookUrl?: string;
            trelloKey?: string;
            trelloToken?: string;
            trelloListId?: string;
        };
    };
    accentColor: string;
    markups: MarkupObject[];
    projects: Project[];
    currentProjectId: string | null;
    fetchRequestId: number;
    markupFetchRequestId: number;


    // Actions
    stats: {
        totalNotes: number;
        totalMarkups: number;
        domainCount: number;
        projectCounts: Record<string, number>;
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
    setAccentColor: (color: string) => void;

    // Markup Actions
    fetchMarkupsForUrl: (url: string) => Promise<void>;
    addMarkup: (markup: MarkupObject) => Promise<void>;
    updateMarkup: (id: string, updates: Partial<MarkupObject>) => Promise<void>;
    deleteMarkup: (id: string) => Promise<void>;
    undoMarkup: () => Promise<void>;
    redoMarkup: () => Promise<void>;
    clearAllMarkups: () => Promise<void>;

    // Project Actions
    fetchAllProjects: () => Promise<void>;
    addProject: (project: Project) => Promise<void>;
    updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    setCurrentProjectId: (id: string | null) => void;

    // Data Management
    exportData: (domain?: string) => Promise<void>;
    importData: (jsonData: string) => Promise<void>;
    shareSnapshot: (domain?: string) => Promise<string>;
    toggleNoteSharing: (noteId: string) => Promise<void>;

    // Workflow Integration
    syncToExternalService: (noteId: string, service: 'notion' | 'slack' | 'trello') => Promise<boolean>;
    saveVoiceMemo: (noteId: string, audioBlob: Blob) => Promise<void>;
}

const STORAGE_KEY = 'pagepost_notes';
const MARKUP_STORAGE_KEY = 'pagepost_markups';
const SETTINGS_KEY = 'pagepost_settings';
const PROJECTS_KEY = 'pagepost_projects';
const CURRENT_PROJECT_KEY = 'pagepost_current_project';
const DASHBOARD_VIEW_MODE_KEY = 'pagepost_dashboard_view_mode';

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
                    if (changes[PROJECTS_KEY]) {
                        set({ projects: (changes[PROJECTS_KEY].newValue || []) as Project[] });
                    }
                    if (changes[CURRENT_PROJECT_KEY]) {
                        const { isGlobalView, fetchAllNotes, fetchNotesForUrl, currentUrl } = get();
                        set({ currentProjectId: (changes[CURRENT_PROJECT_KEY].newValue as string | null) || null });
                        if (isGlobalView) fetchAllNotes();
                        else if (currentUrl) fetchNotesForUrl(currentUrl);
                    }
                    if (changes[DASHBOARD_VIEW_MODE_KEY]) {
                        set({ dashboardViewMode: (changes[DASHBOARD_VIEW_MODE_KEY].newValue as 'list' | 'canvas') || 'list' });
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
        dashboardViewMode: 'list',
        stats: {
            totalNotes: 0,
            totalMarkups: 0,
            domainCount: 0,
            projectCounts: {},
        },
        mode: 'note',
        currentTool: 'pen',
        currentColor: '#3b82f6',
        fetchRequestId: 0,

        settings: {
            fontFamily: 'Pretendard, -apple-system, sans-serif',
            fontSize: 14,
            textColor: '#1a1a1a',
            showToolbar: false, // Default to false to prevent flashing
            isToolbarExpanded: false, // Default to false to prevent flashing
            penWidth: 3,
            highlightWidth: 20,
            markupOpacity: 1.0,
            isCleanView: false,
            cleanViewOpacity: 0.1,
            toolbarPosition: { x: 50, y: 88 },
            toolbarOpacity: 1.0,
            showMiniMap: true,
            apiKeys: {}
        },
        accentColor: '#FFD54F',
        markups: [],
        projects: [],
        currentProjectId: null,
        markupFetchRequestId: 0,

        loadSettings: async () => {
            if (!isContextValid()) {
                // If context is invalid (e.g. testing), set it to true but keep defaults or fallback
                set({ settings: { ...get().settings, showToolbar: true, isToolbarExpanded: true }, isSettingsLoaded: true });
                return;
            }
            try {
                const result = await chrome.storage.local.get(SETTINGS_KEY);
                if (!isContextValid()) return;

                if (result[SETTINGS_KEY]) {
                    const loadedSettings = result[SETTINGS_KEY] as any;
                    // Ensure toolbarPosition is properly merged or defaulted
                    if (!loadedSettings.toolbarPosition || typeof loadedSettings.toolbarPosition.x !== 'number') {
                        loadedSettings.toolbarPosition = { x: 50, y: 88 };
                    }
                    set({ settings: { ...get().settings, ...loadedSettings }, isSettingsLoaded: true });
                } else {
                    // New user: enable toolbar by default but AFTER setting isSettingsLoaded to true
                    set({
                        settings: {
                            ...get().settings,
                            showToolbar: true,
                            isToolbarExpanded: true
                        },
                        isSettingsLoaded: true
                    });
                }
            } catch (error) {
                console.error('Failed to load settings:', error);
                set({ isSettingsLoaded: true });
            }

            try {
                const res = await chrome.storage.local.get(DASHBOARD_VIEW_MODE_KEY);
                const mode = res[DASHBOARD_VIEW_MODE_KEY];
                if (mode === 'list' || mode === 'canvas') {
                    set({ dashboardViewMode: mode });
                }
            } catch (e) { }
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

        setDashboardViewMode: (mode) => {
            set({ dashboardViewMode: mode });
            if (isContextValid()) {
                chrome.storage.local.set({ [DASHBOARD_VIEW_MODE_KEY]: mode });
            }
        },

        updateCanvasPosition: async (noteId, position) => {
            const { updateNoteState } = get();

            // Memory update for smooth dragging
            updateNoteState(noteId, { canvasPosition: position });

            // Persist to storage
            if (isContextValid()) {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                const notes = (result[STORAGE_KEY] || []) as Note[];
                const updatedNotes = notes.map(n =>
                    n.id === noteId ? { ...n, canvasPosition: position, updatedAt: Date.now() } : n
                );
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedNotes });
            }
        },

        moveNoteToProject: async (noteId, projectId) => {
            const { updateNoteState, isGlobalView, currentUrl, fetchAllNotes, fetchNotesForUrl } = get();

            // Memory update
            updateNoteState(noteId, { projectId: projectId || undefined });

            // Persist
            if (isContextValid()) {
                const result = await chrome.storage.local.get(STORAGE_KEY);
                const notes = (result[STORAGE_KEY] || []) as Note[];
                const updatedNotes = notes.map(n =>
                    n.id === noteId ? { ...n, projectId: projectId || undefined, updatedAt: Date.now() } : n
                );
                await chrome.storage.local.set({ [STORAGE_KEY]: updatedNotes });

                // Refresh views
                if (isGlobalView) fetchAllNotes();
                else if (currentUrl) fetchNotesForUrl(currentUrl);
            }
        },

        setCurrentProjectId: (id) => {
            set({ currentProjectId: id });
            if (isContextValid()) {
                chrome.storage.local.set({ [CURRENT_PROJECT_KEY]: id });
            }
            // Trigger refresh
            const { isGlobalView, fetchAllNotes, fetchNotesForUrl, currentUrl } = get();
            if (isGlobalView) fetchAllNotes();
            else if (currentUrl) fetchNotesForUrl(currentUrl);
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
        setAccentColor: (color) => set({ accentColor: color }),
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

                // Filter by project if currentProjectId is set
                const { currentProjectId, searchQuery } = get();
                if (currentProjectId) {
                    allNotes = allNotes.filter(n => n.projectId === currentProjectId);
                }

                // Filter by search query if exists
                const query = searchQuery.toLowerCase();
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

                // Compute per-project counts
                const projectCounts: Record<string, number> = {};
                allNotes.forEach(n => {
                    const pid = n.projectId || 'unclassified';
                    projectCounts[pid] = (projectCounts[pid] || 0) + 1;
                });

                set({
                    stats: {
                        totalNotes: allNotes.length,
                        totalMarkups: allMarkups.length,
                        domainCount: domains.size,
                        projectCounts
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
                let filteredNotes = allNotes.filter(n => normalizeUrl(n.url) === normalizedUrl);

                // Filter by project if currentProjectId is set
                const { currentProjectId, searchQuery } = get();
                if (currentProjectId) {
                    filteredNotes = filteredNotes.filter(n => n.projectId === currentProjectId);
                }

                const query = searchQuery.toLowerCase();
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
                const noteWithTags: Note = {
                    ...note,
                    url: normalizedUrl,
                    projectId: note.projectId || get().currentProjectId || undefined,
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

                const existingNote = allNotes.find(n => n.id === id);
                if (!existingNote) return;

                const updatedAt = Date.now();
                let finalUpdates: any = { ...updates, updatedAt };

                // Handle content-specific updates (Tags and History)
                if (updates.content !== undefined) {
                    // Update tags based on current content (replaces old tags)
                    const tags = Array.from(updates.content.matchAll(/#(\w+)/g)).map(m => m[1]);
                    finalUpdates.tags = [...new Set(tags)];

                    // Record history if content has actually changed
                    if (updates.content !== existingNote.content) {
                        const historyEntry = {
                            content: existingNote.content,
                            updatedAt: existingNote.updatedAt
                        };
                        const newHistory = [historyEntry, ...(existingNote.history || [])].slice(0, 50);
                        finalUpdates.history = newHistory;
                    }
                }

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
                const markupWithUrl: MarkupObject = {
                    ...markup,
                    url: normalizedUrl,
                    projectId: markup.projectId || get().currentProjectId || undefined
                };

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

        fetchAllProjects: async () => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get([PROJECTS_KEY, CURRENT_PROJECT_KEY]);
                if (!isContextValid()) return;
                const projects = (result[PROJECTS_KEY] || []) as Project[];
                const currentProjectId = (result[CURRENT_PROJECT_KEY] as string | null) || null;
                set({ projects, currentProjectId });
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            }
        },

        addProject: async (project) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(PROJECTS_KEY);
                if (!isContextValid()) return;
                const existingProjects = (result[PROJECTS_KEY] || []) as Project[];
                const updatedProjects = [...existingProjects, project];
                await chrome.storage.local.set({ [PROJECTS_KEY]: updatedProjects });
                if (!isContextValid()) return;
                set({ projects: updatedProjects });
            } catch (error) {
                console.error('Failed to add project:', error);
            }
        },

        updateProject: async (id, updates) => {
            if (!isContextValid()) return;
            try {
                const result = await chrome.storage.local.get(PROJECTS_KEY);
                if (!isContextValid()) return;
                const projects = (result[PROJECTS_KEY] || []) as Project[];
                const updatedProjects = projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p);
                await chrome.storage.local.set({ [PROJECTS_KEY]: updatedProjects });
                if (!isContextValid()) return;
                set({ projects: updatedProjects });
            } catch (error) {
                console.error('Failed to update project:', error);
            }
        },

        deleteProject: async (id: string) => {
            if (!isContextValid()) return;
            try {
                // 1. Fetch all data
                const result = await chrome.storage.local.get([PROJECTS_KEY, STORAGE_KEY, MARKUP_STORAGE_KEY]);
                if (!isContextValid()) return;

                const projects = (result[PROJECTS_KEY] || []) as Project[];
                const allNotes = (result[STORAGE_KEY] || []) as Note[];
                const allMarkups = (result[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                // 2. Remove project from list
                const updatedProjects = projects.filter(p => p.id !== id);

                // 3. Detach notes and markups from this project
                const updatedNotes = allNotes.map(note =>
                    note.projectId === id ? { ...note, projectId: undefined } : note
                );
                const updatedMarkups = allMarkups.map(markup =>
                    markup.projectId === id ? { ...markup, projectId: undefined } : markup
                );

                // 4. Save everything back
                await chrome.storage.local.set({
                    [PROJECTS_KEY]: updatedProjects,
                    [STORAGE_KEY]: updatedNotes,
                    [MARKUP_STORAGE_KEY]: updatedMarkups
                });

                if (!isContextValid()) return;

                const currentId = get().currentProjectId;
                const newCurrentId = currentId === id ? null : currentId;

                // 5. Update state
                set({
                    projects: updatedProjects,
                    currentProjectId: newCurrentId
                });

                if (currentId === id) {
                    await chrome.storage.local.set({ [CURRENT_PROJECT_KEY]: null });
                }

                // 6. Refresh notes if necessary to reflect project change
                if (get().currentUrl) {
                    get().fetchNotesForUrl(get().currentUrl);
                }
            } catch (error) {
                console.error('Failed to delete project:', error);
            }
        },

        shareSnapshot: async (domain?: string) => {
            if (!isContextValid()) return '';
            try {
                const notesResult = await chrome.storage.local.get(STORAGE_KEY);
                const markupsResult = await chrome.storage.local.get(MARKUP_STORAGE_KEY);
                if (!isContextValid()) return '';

                let notesToExport = (notesResult[STORAGE_KEY] || []) as Note[];
                let markupsToExport = (markupsResult[MARKUP_STORAGE_KEY] || []) as MarkupObject[];

                const targetDomain = domain || (get().currentUrl ? new URL(get().currentUrl).hostname : '');

                if (targetDomain) {
                    notesToExport = notesToExport.filter(n => n.domain === targetDomain);
                    const urls = new Set(notesToExport.map(n => n.url));
                    markupsToExport = markupsToExport.filter(m => urls.has(m.url));
                }

                const data = {
                    version: '2.0-SNAPSHOT',
                    timestamp: Date.now(),
                    domain: targetDomain,
                    notes: notesToExport,
                    markups: markupsToExport
                };

                // In a real product, we would POST this to a server and get a short ID.
                // For this MVP, we simulate it by encoding the data into a "Snapshot Link".
                const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
                const shareLink = `https://pagepost.io/view?snapshot=${encodeURIComponent(serialized)}`;

                return shareLink;
            } catch (error) {
                console.error('Failed to generate share snapshot:', error);
                return '';
            }
        },

        toggleNoteSharing: async (id: string) => {
            const { updateNote, notes } = get();
            const note = notes.find(n => n.id === id);
            if (!note) return;

            const isShared = !note.isShared;
            const shareId = isShared ? (note.shareId || crypto.randomUUID()) : note.shareId;

            await updateNote(id, { isShared, shareId });
        },

        syncToExternalService: async (noteId, service) => {
            const { updateNote, notes, settings } = get();
            const note = notes.find(n => n.id === noteId);
            if (!note || !isContextValid()) return false;

            // Use apiKeys from settings
            const apiKeys = settings.apiKeys || {};

            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: 'SYNC_NOTE',
                    service,
                    apiKeys,
                    data: {
                        url: note.url,
                        content: note.content,
                        domain: note.domain
                    }
                }, async (response) => {
                    if (response && response.ok) {
                        const integrationId = response.id;
                        const updates: Partial<Note> = {
                            integrations: {
                                ...(note.integrations || {})
                            }
                        };

                        let hasUpdate = false;
                        if (service === 'notion' && integrationId) {
                            updates.integrations!.notionId = integrationId;
                            hasUpdate = true;
                        } else if (service === 'slack' && integrationId) {
                            updates.integrations!.slackTs = integrationId;
                            hasUpdate = true;
                        } else if (service === 'trello' && integrationId) {
                            updates.integrations!.trelloId = integrationId;
                            hasUpdate = true;
                        }

                        if (hasUpdate) {
                            updates.integrations!.syncedAt = Date.now();
                            await updateNote(noteId, updates);
                            resolve(true);
                        } else {
                            // If ok is true but no ID, still resolve but don't show as synced
                            resolve(true);
                        }
                    } else {
                        const errorMsg = response?.error || '알 수 없는 서버 오류';
                        console.error(`PagePost: ${service} sync fail:`, errorMsg);
                        alert(`${service} 연동 실패!\n\n[상세 내용]: ${errorMsg}\n\n도움말: 설정의 토큰값이나 데이터베이스 권한(연결 추가)을 다시 확인해 보세요.`);
                        resolve(false);
                    }
                });
            });
        },

        saveVoiceMemo: async (noteId, audioBlob) => {
            const { updateNote } = get();

            // In a real app, we'd upload this to S3/Supabase Storage.
            // Here we convert to base64 for local persistence.
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                await updateNote(noteId, { audioUrl: base64Audio });
            };
        }
    };
});
