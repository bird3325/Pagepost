import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { Camera, X, Download } from 'lucide-react';

export const CaptureLayer: React.FC = () => {
    const { mode, setMode } = useNoteStore();
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when entering/leaving capture mode
    useEffect(() => {
        if (mode !== 'capture') {
            setCapturedImage(null);
            setIsSelecting(false);
        }
    }, [mode]);

    if (mode !== 'capture') return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (capturedImage) return;
        setIsSelecting(true);
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

        const left = Math.min(startPos.x, currentPos.x);
        const top = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);

        // Don't capture if too small
        if (width < 10 || height < 10) return;

        // Trigger capture from background
        try {
            const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });
            if (response?.dataUrl) {
                cropImage(response.dataUrl, left, top, width, height);
            }
        } catch (error) {
            console.error('Capture failed:', error);
            alert('캡쳐에 실패했습니다.');
        }
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
            className="fixed inset-0 z-[2147483646] bg-black/40 cursor-crosshair overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Guide Text */}
            {!capturedImage && !isSelecting && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-gray-900 border border-brand-primary text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce pointer-events-none">
                    <Camera size={20} className="text-brand-primary" />
                    <span className="font-bold">캡쳐할 영역을 드래그하여 선택하세요</span>
                </div>
            )}

            {/* Selection Box */}
            {isSelecting && (
                <div
                    className="absolute border-2 border-brand-primary bg-brand-primary/10 shadow-[0_0_20px_rgba(255,213,79,0.3)] pointer-events-none"
                    style={selectionStyle}
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
