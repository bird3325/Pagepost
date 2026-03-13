import React, { useEffect } from 'react';
import { NoteCard } from './NoteCard';
import { useNoteStore } from '../store/useNoteStore';

export const NoteContainer: React.FC = () => {
    const { notes, fetchNotesForUrl, currentUrl } = useNoteStore();

    // Initial fetch to ensure notes are loaded on mount
    useEffect(() => {
        console.log('PagePost: NoteContainer mounted, current store URL:', currentUrl);
        fetchNotesForUrl(window.location.href);
    }, [fetchNotesForUrl]); // Remove currentUrl to avoid redundant fetches since content script handles it





    return (
        <div id="pagepost-notes-root">
            {notes.map((note) => (
                <NoteCard key={note.id} note={note} />
            ))}
        </div>
    );
};
