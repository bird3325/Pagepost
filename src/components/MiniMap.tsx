import React, { useEffect, useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';

/**
 * MiniMap component that displays dots on the right edge of the screen
 * representing the vertical positions of all notes on the current page.
 */
export const MiniMap: React.FC = () => {
    const { notes, settings, activeNoteId, mode, isSettingsLoaded } = useNoteStore();
    const [docHeight, setDocHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => {
            setDocHeight(Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            ));
        };

        // Update height periodically as dynamic content loads
        const interval = setInterval(updateHeight, 2000);
        window.addEventListener('scroll', updateHeight);
        window.addEventListener('resize', updateHeight);

        updateHeight();

        return () => {
            clearInterval(interval);
            window.removeEventListener('scroll', updateHeight);
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    if (!isSettingsLoaded || !settings.showMiniMap || notes.length === 0 || mode === 'review') return null;

    return (
        <div
            id="pagepost-minimap"
            className="fixed top-0 right-0 h-full w-[20px] z-[2147483646] pointer-events-none flex flex-col items-center py-6"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                backdropFilter: 'blur(4px)',
                borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '-2px 0 15px rgba(0,0,0,0.1)'
            }}
        >
            <div className="relative w-full h-full">
                {notes.map(note => {
                    const isActive = activeNoteId === note.id;
                    // Position the dot relative to the document height
                    const topPct = (note.notePosition.y / docHeight) * 100;

                    // Clamp topPct to keep it within view
                    const clampedTop = Math.min(98, Math.max(2, topPct));

                    return (
                        <div
                            key={note.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                window.scrollTo({
                                    top: note.notePosition.y - (window.innerHeight / 2),
                                    behavior: 'smooth'
                                });
                            }}
                            className={`absolute left-1/2 -translate-x-1/2 rounded-full cursor-pointer pointer-events-auto border-2 border-white/80 hover:scale-150 transition-all duration-300 active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.4)] ${isActive ? 'w-[14px] h-[14px] z-20 animate-pulse' : 'w-[10px] h-[10px] z-10'}`}
                            style={{
                                top: `${clampedTop}%`,
                                backgroundColor: note.color || '#FFD54F',
                                boxShadow: isActive
                                    ? `0 0 20px ${note.color || '#FFD54F'}, 0 0 10px rgba(0,0,0,0.5)`
                                    : `0 0 8px ${note.color || '#FFD54F'}`,
                                transform: `translateX(-50%) ${isActive ? 'scale(1.2)' : 'scale(1)'}`
                            }}
                            title={note.content ? (note.content.substring(0, 50) + '...') : '메모 위치'}
                        />
                    );
                })}
            </div>
        </div>
    );
};
