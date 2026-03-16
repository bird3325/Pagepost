import React, { useEffect } from 'react';
import { NoteCard } from './NoteCard';
import { useNoteStore } from '../store/useNoteStore';
import { FloatingToolbar } from './FloatingToolbar';

export const NoteContainer: React.FC = () => {
    const { notes, fetchNotesForUrl, fetchMarkupsForUrl, settings, loadSettings, isSettingsLoaded, mode, setActiveNoteId } = useNoteStore();

    // Initial fetch to ensure notes and markups are loaded on mount
    useEffect(() => {
        const url = window.location.href;
        loadSettings();
        fetchNotesForUrl(url);
        fetchMarkupsForUrl(url);

        const handleBackgroundClick = (e: MouseEvent) => {
            // If clicking root or body directly, clear selection
            if (e.target === document.body || (e.target as HTMLElement).id === 'pagepost-notes-root') {
                setActiveNoteId(null);
            }
        };
        window.addEventListener('mousedown', handleBackgroundClick);
        return () => window.removeEventListener('mousedown', handleBackgroundClick);
    }, [fetchNotesForUrl, fetchMarkupsForUrl, loadSettings, setActiveNoteId]);

    const isExtensionPage = window.location.protocol === 'chrome-extension:';

    return (
        <div id="pagepost-notes-root" className="pointer-events-none">
            {isSettingsLoaded && settings.showToolbar && mode !== 'capture' && !isExtensionPage && <FloatingToolbar />}
            <div className="pointer-events-none">
                {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>
        </div>
    );
};
