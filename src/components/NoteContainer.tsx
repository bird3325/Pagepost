import React, { useEffect } from 'react';
import { NoteCard } from './NoteCard';
import { useNoteStore } from '../store/useNoteStore';
import { MarkupLayer } from '../content/MarkupLayer';
import { FloatingToolbar } from './FloatingToolbar';

export const NoteContainer: React.FC = () => {
    const { notes, fetchNotesForUrl, fetchMarkupsForUrl, settings, loadSettings } = useNoteStore();

    // Initial fetch to ensure notes and markups are loaded on mount
    useEffect(() => {
        const url = window.location.href;
        loadSettings();
        fetchNotesForUrl(url);
        fetchMarkupsForUrl(url);
    }, [fetchNotesForUrl, fetchMarkupsForUrl, loadSettings]);

    return (
        <div id="pagepost-notes-root" className="pointer-events-none">
            <MarkupLayer />
            {settings.showToolbar && <FloatingToolbar />}
            <div className="pointer-events-none">
                {notes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                ))}
            </div>
        </div>
    );
};
