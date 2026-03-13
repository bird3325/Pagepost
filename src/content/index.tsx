/// <reference types="chrome" />

import { createRoot } from 'react-dom/client';
import { NoteContainer } from '../components/NoteContainer';
import { captureAnchor } from '../utils/anchoring';
import { useNoteStore } from '../store/useNoteStore';
import { normalizeUrl } from '../utils/url';
// Import tailwind CSS as inline string to inject only into shadow dom
import tailwindStyles from '../index.css?inline';
import contentStyles from './style.css?inline';

let lastElement: HTMLElement | null = null;
let lastClickInfo = { x: 0, y: 0 };

// Capture the last right-click information to position the note correctly
document.addEventListener('contextmenu', (e: MouseEvent) => {
    lastElement = e.target as HTMLElement;
    lastClickInfo = { x: e.clientX, y: e.clientY };
}, true);

const handleMessage = (message: any) => {
    console.log('PagePost: Message received:', message.type);
    if (message.type === "CREATE_NOTE_CLICK") {
        const normalizedUrl = normalizeUrl(window.location.href);
        const targetElement = lastElement || document.body;
        const anchor = captureAnchor(targetElement, lastClickInfo.x, lastClickInfo.y);

        const newNote = {
            id: crypto.randomUUID(),
            url: normalizedUrl,
            domain: window.location.hostname,
            anchor,
            content: '',
            color: '#FFF9C4',
            size: { width: 200, height: 150 },
            notePosition: {
                x: Math.max(0, lastClickInfo.x),
                y: Math.max(0, lastClickInfo.y + window.scrollY)
            },
            tags: [],
            status: 'active' as const,
            isPinned: false,
            isCollapsed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        useNoteStore.getState().addNote(newNote).then(() => {
            useNoteStore.getState().setActiveNoteId(newNote.id);
        }).catch(err => {
            console.error('PagePost: Failed to create note:', err);
        });
    }

    if (message.type === "SCROLL_TO_NOTE") {
        const host = document.getElementById('pagepost-extension-host');
        const rootContainer = host?.shadowRoot?.getElementById('pagepost-root-container');
        const noteElement = rootContainer?.querySelector(`[data-note-id="${message.noteId}"]`);
        if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (noteElement as HTMLElement).classList.add('animate-pulse', 'ring-4', 'ring-brand-primary');
            setTimeout(() => {
                (noteElement as HTMLElement).classList.remove('animate-pulse', 'ring-4', 'ring-brand-primary');
            }, 3000);
        }
    }

    if (message.type === "URL_UPDATED") {
        console.log('PagePost: URL updated via background:', message.url);
        useNoteStore.getState().fetchNotesForUrl(message.url);
    }
};

const handleScrollHash = () => {
    const hash = window.location.hash;
    const match = hash.match(/#pagepost-note-([a-f0-9-]+)/i);
    if (match) {
        const noteId = match[1];
        console.log('PagePost: Detected scroll-to hash for note:', noteId);
        // Wait a bit for notes to load and render
        setTimeout(() => {
            handleMessage({ type: "SCROLL_TO_NOTE", noteId });
        }, 1000);
    }
};

const init = () => {
    console.log('PagePost: Initializing content script...');

    handleScrollHash();

    if (!document.body) {
        console.log('PagePost: document.body not found, waiting...');
        setTimeout(init, 100);
        return;
    }

    if (document.getElementById('pagepost-extension-host')) {
        console.log('PagePost: Already initialized, skipping.');
        return;
    }

    try {
        const host = document.createElement('div');
        host.id = 'pagepost-extension-host';
        Object.assign(host.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '2147483647',
        });
        document.body.appendChild(host);

        const shadow = host.attachShadow({ mode: 'open' });
        const rootContainer = document.createElement('div');
        rootContainer.id = 'pagepost-root-container';
        Object.assign(rootContainer.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
        });
        shadow.appendChild(rootContainer);

        // Style injection for Shadow DOM
        const styleTag = document.createElement('style');
        styleTag.textContent = (tailwindStyles || '') + '\n' + (contentStyles || '');
        shadow.appendChild(styleTag);

        const root = createRoot(rootContainer);
        root.render(<NoteContainer />);
        console.log('PagePost: UI Root rendered into Shadow DOM');
    } catch (err) {
        console.error('PagePost: Initialization failed:', err);
    }
};

// Start initialization
init();


// Global message listener - SINGLE REGISTER
chrome.runtime.onMessage.addListener(handleMessage);

// Robust URL detection for SPAs
let lastUrl = normalizeUrl(window.location.href);
const checkUrlChange = (forcedUrl?: string) => {
    const currentUrl = normalizeUrl(forcedUrl || window.location.href);
    if (currentUrl !== lastUrl) {
        console.log(`PagePost: URL change confirmed from ${lastUrl} to ${currentUrl}`);
        lastUrl = currentUrl;
        useNoteStore.getState().fetchNotesForUrl(currentUrl);
    }
};

window.addEventListener('pagepost-url-change', (e: any) => {
    checkUrlChange(e.detail);
});

window.addEventListener('popstate', () => checkUrlChange());
window.addEventListener('hashchange', () => {
    checkUrlChange();
    handleScrollHash();
});
setInterval(() => checkUrlChange(), 250); // Faster polling as safety fallback



// Ensure the extension host persists even if the SPA clears the body
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            const hostRemoved = Array.from(mutation.removedNodes).some(
                (node) => (node as HTMLElement).id === 'pagepost-extension-host'
            );
            if (hostRemoved) {
                console.log('PagePost: Extension host removed by page, re-initializing...');
                init();
            }
        }
    }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

