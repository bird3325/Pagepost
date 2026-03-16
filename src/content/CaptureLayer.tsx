import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { Camera, X, Download } from 'lucide-react';

export const CaptureLayer: React.FC = () => {
    const { mode, setMode } = useNoteStore();
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [selectionConfirmed, setSelectionConfirmed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state and handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (capturedImage) {
                    setCapturedImage(null);
                } else {
                    setMode('note');
                }
            }
        };

        if (mode === 'capture') {
            window.addEventListener('keydown', handleKeyDown);
        }

        if (mode !== 'capture') {
            setCapturedImage(null);
            setIsSelecting(false);
            setSelectionConfirmed(false);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [mode, capturedImage, setMode]);

    if (mode !== 'capture') return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (capturedImage) return;

        // Pre-emptive check for extension context invalidation
        if (!chrome.runtime?.id) {
            alert('확장 프로그램이 업데이트되었습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
            setMode('note');
            return;
        }

        e.preventDefault(); // Prevent text selection/drag interference
        setIsSelecting(true);
        setSelectionConfirmed(false);
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isSelecting) return;
        setCurrentPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = async () => {
        if (!isSelecting) return;
        setIsSelecting(false);

        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);

        // Don't capture if too small
        if (width < 10 || height < 10) {
            setSelectionConfirmed(false);
            return;
        }

        setSelectionConfirmed(true);

        const left = Math.min(startPos.x, currentPos.x);
        const top = Math.min(startPos.y, currentPos.y);

        // Selective hiding for clean capture (excluding markups)
        const host = document.getElementById('pagepost-extension-host');
        const notesRoot = host?.shadowRoot?.getElementById('pagepost-notes-root');
        const captureRoot = containerRef.current;

        if (notesRoot) notesRoot.style.visibility = 'hidden';
        if (captureRoot) captureRoot.style.visibility = 'hidden';

        // Wait for UI to hide
        setTimeout(async () => {
            try {
                const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });

                // Restore UI visibility
                if (notesRoot) notesRoot.style.visibility = 'visible';
                if (captureRoot) captureRoot.style.visibility = 'visible';

                if (response?.dataUrl) {
                    cropImage(response.dataUrl, left, top, width, height);
                }
            } catch (error: any) {
                if (notesRoot) notesRoot.style.visibility = 'visible';
                if (captureRoot) captureRoot.style.visibility = 'visible';

                console.error('Capture failed:', error);

                if (error?.message?.includes('Extension context invalidated')) {
                    alert('확장 프로그램이 업데이트되었습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
                } else {
                    alert('캡쳐에 실패했습니다.');
                }

                setSelectionConfirmed(false);
            }
        }, 150);
    };

    const cropImage = (dataUrl: string, x: number, y: number, width: number, height: number) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr);
                // Draw only the selected portion
                // The captureVisibleTab takes the screen as is, so we need to account for scrolling if needed?
                // Actually captureVisibleTab is JUST the visible part. So x, y should align with clientX, clientY.
                ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
                setCapturedImage(canvas.toDataURL('image/png'));
                setSelectionConfirmed(false);
            }
        };
        img.src = dataUrl;
    };

    const downloadImage = () => {
        if (!capturedImage) return;
        const link = document.createElement('a');
        link.href = capturedImage;
        link.download = `pagepost_capture_${Date.now()}.png`;
        link.click();
        setMode('note'); // Return to note mode after download
    };

    const selectionStyle = {
        left: Math.min(startPos.x, currentPos.x),
        top: Math.min(startPos.y, currentPos.y),
        width: Math.abs(startPos.x - currentPos.x),
        height: Math.abs(startPos.y - currentPos.y),
    };

    return (
        <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2147483646,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                cursor: 'crosshair',
                overflow: 'hidden',
                pointerEvents: 'auto'
            }}
        >
            {/* Guide Text & Exit Button */}
            {!capturedImage && !isSelecting && !selectionConfirmed && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    <div className="bg-gray-900 border border-brand-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
                        <Camera size={20} className="text-brand-primary" />
                        <span className="font-bold">캡쳐할 영역을 드래그하여 선택하세요</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMode('note'); }}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all hover:scale-105 pointer-events-auto"
                    >
                        <X size={16} />
                        취소 (ESC)
                    </button>
                </div>
            )}

            {/* Selection Box */}
            {(isSelecting || selectionConfirmed) && !capturedImage && (
                <div
                    className="absolute border-2 border-brand-primary bg-white/5 shadow-[0_0_30px_rgba(255,213,79,0.5)] pointer-events-none"
                    style={{
                        ...selectionStyle,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 213, 79, 0.8)',
                    }}
                />
            )}

            {/* Preview Overlay */}
            {capturedImage && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6 p-10 animate-in fade-in duration-300">
                    <div className="relative group">
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="max-w-full max-h-[70vh] rounded-lg border-2 border-brand-primary shadow-2xl"
                        />
                        <button
                            onClick={() => setCapturedImage(null)}
                            className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={downloadImage}
                            className="flex items-center gap-2 bg-brand-primary text-gray-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            <Download size={24} />
                            다운로드 및 저장
                        </button>
                        <button
                            onClick={() => setMode('note')}
                            className="flex items-center gap-2 bg-gray-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-700 transition-all border border-white/10"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
