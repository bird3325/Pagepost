import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { X, Download, Maximize, MousePointer2, Scroll, Loader2 } from 'lucide-react';

export const CaptureLayer: React.FC = () => {
    const { mode, setMode } = useNoteStore();
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureProgress, setCaptureProgress] = useState(0);
    const [captureType, setCaptureType] = useState<'area' | 'full' | 'scroll'>('area');
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
        if (capturedImage || isCapturing || captureType !== 'area') return;

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

        const captureRoot = containerRef.current;
        if (captureRoot) {
            captureRoot.style.visibility = 'hidden';
            captureRoot.style.opacity = '0';
        }

        // Wait for UI to hide
        setTimeout(async () => {
            try {
                if (!isExtensionValid()) throw new Error('Extension context invalidated');
                const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });

                // Restore UI visibility
                if (captureRoot) {
                    captureRoot.style.visibility = 'visible';
                    captureRoot.style.opacity = '1';
                }

                if (response?.dataUrl) {
                    cropImage(response.dataUrl, left, top, width, height);
                }
            } catch (error: any) {
                if (captureRoot) {
                    captureRoot.style.visibility = 'visible';
                    captureRoot.style.opacity = '1';
                }

                console.error('Capture failed:', error);

                if (error?.message?.includes('Extension context invalidated')) {
                    alert('확장 프로그램이 업데이트되었습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
                } else {
                    alert('캡쳐에 실패했습니다.');
                }

                setSelectionConfirmed(false);
            }
        }, 300);
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
                ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
                setCapturedImage(canvas.toDataURL('image/png'));
                setSelectionConfirmed(false);
            }
        };
        img.src = dataUrl;
    };

    const isExtensionValid = () => {
        try {
            return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
        } catch (e) {
            return false;
        }
    };

    const handleVisibleCapture = async () => {
        if (!isExtensionValid() || isCapturing) return;

        const captureRoot = containerRef.current;
        if (captureRoot) {
            captureRoot.style.visibility = 'hidden';
            captureRoot.style.opacity = '0';
        }

        try {
            // Wait for UI to hide and browser to repaint
            await new Promise(r => setTimeout(r, 300));
            if (!isExtensionValid()) throw new Error('Extension context invalidated');

            const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });
            if (response?.dataUrl) {
                setCapturedImage(response.dataUrl);
            }
        } catch (error: any) {
            console.error('Visible capture failed:', error);
            if (error?.message?.includes('context invalidated') || !isExtensionValid()) {
                alert('확장 프로그램이 업데이트되었습니다.\n페이지를 새로고침한 후 다시 시도해주세요.');
            } else {
                alert('현재 화면 캡쳐에 실패했습니다.');
            }
        } finally {
            if (isExtensionValid() && captureRoot) {
                captureRoot.style.visibility = 'visible';
                captureRoot.style.opacity = '1';
            }
        }
    };

    const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    };

    const handleFullPageCapture = async () => {
        if (!isExtensionValid() || isCapturing) return;

        setIsCapturing(true);
        setCaptureProgress(0);
        const captureRoot = containerRef.current;
        if (captureRoot) {
            captureRoot.style.visibility = 'hidden';
            captureRoot.style.opacity = '0';
        }

        try {
            if (!isExtensionValid()) throw new Error('Extension context invalidated');
            // Wait for UI to hide and browser to repaint
            await new Promise(r => setTimeout(r, 300));
            const originalScrollPos = { x: window.scrollX, y: window.scrollY };

            // Temporary hide elements that might cause trouble
            const style = document.createElement('style');
            style.innerHTML = `
                * { transition: none !important; animation: none !important; }
                html { scroll-behavior: auto !important; }
            `;
            document.head.appendChild(style);

            const totalHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
            const totalWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const dpr = window.devicePixelRatio || 1;

            const canvas = document.createElement('canvas');
            canvas.width = totalWidth * dpr;
            canvas.height = totalHeight * dpr;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context failed');

            let currentScrollTop = 0;
            const chunks: { dataUrl: string, top: number, height: number }[] = [];

            while (currentScrollTop < totalHeight) {
                window.scrollTo(0, currentScrollTop);
                // Wait for rendering & animations and avoid Chrome quota limits
                await new Promise(r => setTimeout(r, 750));

                if (!isExtensionValid()) throw new Error('Extension context invalidated');
                const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' });
                if (response?.dataUrl) {
                    const drawHeight = Math.min(viewportHeight, totalHeight - currentScrollTop);
                    chunks.push({
                        dataUrl: response.dataUrl,
                        top: currentScrollTop,
                        height: drawHeight
                    });
                }

                currentScrollTop += viewportHeight;
                setCaptureProgress(Math.min(95, (currentScrollTop / totalHeight) * 100));

                if (currentScrollTop >= totalHeight) break;
            }

            // Stitch chunks
            for (const chunk of chunks) {
                const img = await loadImage(chunk.dataUrl);
                // If it's the last chunk and it's partial, we need to take only the bottom part of the captured image
                // because captureVisibleTab always captures a full viewport from where the scroll is.
                // But wait, if we scrolled to 'currentScrollTop', the visible part IS what we want.
                // However, at the very bottom, if the remaining height is less than viewport, 
                // the screenshot still shows a full viewport, so we need to offset it.

                const isPointAtBottom = chunk.top + viewportHeight > totalHeight;
                const sourceY = isPointAtBottom ? (viewportHeight - chunk.height) * dpr : 0;

                ctx.drawImage(
                    img,
                    0, sourceY, totalWidth * dpr, chunk.height * dpr,
                    0, chunk.top * dpr, totalWidth * dpr, chunk.height * dpr
                );
            }

            setCapturedImage(canvas.toDataURL('image/png'));
            setCaptureProgress(100);

            // Restore
            window.scrollTo(originalScrollPos.x, originalScrollPos.y);
            document.head.removeChild(style);
        } catch (error) {
            console.error('Full page capture failed:', error);
            alert('개체 캡쳐 중 오류가 발생했습니다.');
        } finally {
            setIsCapturing(false);
            if (captureRoot) {
                captureRoot.style.visibility = 'visible';
                captureRoot.style.opacity = '1';
            }
        }
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
                zIndex: 400,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                cursor: 'crosshair',
                overflow: 'hidden',
                pointerEvents: 'auto'
            }}
        >
            {/* Capture Toolbox */}
            {!capturedImage && !isCapturing && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 animate-in slide-in-from-top duration-500">
                    <div className="bg-gray-900/90 backdrop-blur-xl border border-white/20 p-2 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-1">
                        <button
                            onClick={() => setCaptureType('area')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${captureType === 'area' ? 'bg-brand-primary text-gray-900 font-bold' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <MousePointer2 size={18} />
                            영역 선택
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button
                            onClick={handleVisibleCapture}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all text-gray-400 hover:text-white hover:bg-white/10`}
                        >
                            <Maximize size={18} />
                            전체 화면
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button
                            onClick={handleFullPageCapture} // For now, scroll capture uses the same logic as full page
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all text-gray-400 hover:text-white hover:bg-white/10`}
                        >
                            <Scroll size={18} />
                            스크롤 캡쳐
                        </button>
                        <button
                            onClick={() => setMode('note')}
                            className="ml-2 w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {captureType === 'area' && !isSelecting && (
                        <div className="bg-brand-primary/20 backdrop-blur-md border border-brand-primary/30 text-brand-primary px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                            화면을 드래그하여 캡쳐할 영역을 선택하세요
                        </div>
                    )}
                </div>
            )}

            {/* Progress Indicator */}
            {isCapturing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-8 z-[500]">
                    <div className="relative">
                        <Loader2 size={80} className="text-brand-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center font-black text-white text-xl">
                            {Math.round(captureProgress)}%
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-2xl font-black text-white">스크롤 캡쳐 진행 중...</h2>
                        <p className="text-gray-400">데이터를 수집하고 이미지를 합성하고 있습니다.</p>
                    </div>
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
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setCapturedImage(null)}
                            className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={downloadImage}
                            className="flex items-center gap-2 bg-brand-primary text-gray-900 px-8 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl active:scale-95"
                        >
                            <Download size={24} />
                            다운로드 및 저장
                        </button>
                        <button
                            onMouseDown={(e) => e.stopPropagation()}
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
