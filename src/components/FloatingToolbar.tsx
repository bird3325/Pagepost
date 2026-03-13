import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { StickyNote, PenTool, Highlighter, Eraser, Trash2, ChevronLeft, ChevronRight, Palette, Type, Minus } from 'lucide-react';

export const FloatingToolbar: React.FC = () => {
    const { mode, setMode, currentTool, setTool, currentColor, setColor, clearAllMarkups, settings, updateSettings } = useNoteStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    React.useEffect(() => {
        if (isExpanded) {
            // Trigger entrance animation
            const timer = setTimeout(() => setIsVisible(true), 50);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);

    const colors = [
        { name: 'Blue', value: '#3b82f6' },
        { name: 'Red', value: '#ef4444' },
        { name: 'Green', value: '#10b981' },
        { name: 'Yellow', value: '#f59e0b' },
        { name: 'Purple', value: '#8b5cf6' },
        { name: 'Pink', value: '#ec4899' },
        { name: 'Black', value: '#1a1a1a' },
    ];

    const fonts = [
        { name: '기본 (Pretendard)', value: 'Pretendard, -apple-system, sans-serif' },
        { name: '나눔고딕', value: '"Nanum Gothic", sans-serif' },
        { name: 'G마켓 산스', value: '"Gmarket Sans", sans-serif' },
        { name: '교보 손글씨', value: '"Kyobo Handwriting", cursive' }
    ];

    const handleCollapse = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsExpanded(false);
        }, 500);
    };

    return (
        <div className="fixed bottom-10 inset-x-0 flex justify-center pointer-events-none z-[2147483647]">
            <div style={{ all: 'initial', boxSizing: 'border-box' }} className="pointer-events-auto">
                <div
                    className={`bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_25px_rgba(255,213,79,0.2)] border-brand-primary flex items-center box-border text-white whitespace-nowrap transition-all duration-500 ease-in-out ${isVisible
                        ? 'max-w-[min(800px,94vw)] h-18 rounded-3xl p-3 px-4 gap-3 border-2 overflow-visible'
                        : 'max-w-[64px] h-16 rounded-full p-0 gap-0 border-4 overflow-hidden'
                        }`}
                    style={{ fontStyle: 'normal', fontFamily: 'Pretendard, system-ui, sans-serif' }}
                >
                    {!isExpanded && !isVisible ? (
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="w-16 h-16 text-brand-primary flex items-center justify-center hover:scale-110 transition-all group cursor-pointer shrink-0"
                            title="툴바 열기"
                        >
                            <ChevronRight size={32} className="group-hover:scale-125 transition-transform" />
                        </button>
                    ) : (
                        <div className={`flex items-center gap-3 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
                            {/* Mode Toggle */}
                            <div className="flex bg-white/10 rounded-xl p-1 border border-white/5 shrink-0">
                                <button
                                    onClick={() => setMode('note')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'note' ? 'bg-brand-primary shadow-sm text-gray-900' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="노트 모드"
                                >
                                    <StickyNote size={20} />
                                </button>
                                <button
                                    onClick={() => setMode('markup')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'markup' ? 'bg-brand-primary shadow-sm text-gray-900' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="마크업 모드"
                                >
                                    <PenTool size={20} />
                                </button>
                            </div>

                            <div className="w-px h-8 bg-white/10 mx-1 shrink-0" />

                            {/* Note Tools (Only visible in note mode) */}
                            {mode === 'note' && (
                                <div className="flex gap-2 items-center">
                                    {/* Font Family Picker */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFontPickerOpen(!isFontPickerOpen)}
                                            className="p-2 rounded-lg hover:bg-white/10 flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors"
                                            title="글꼴"
                                        >
                                            <Type size={20} />
                                            <span className="text-[10px] font-bold w-4 truncate opacity-80">{fonts.find(f => f.value === settings.fontFamily)?.name[0] || 'F'}</span>
                                        </button>
                                        {isFontPickerOpen && (
                                            <div className="absolute bottom-full left-0 mb-4 bg-gray-800 shadow-2xl border border-white/10 rounded-xl p-2 flex flex-col gap-1 w-40 backdrop-blur-xl">
                                                {fonts.map(font => (
                                                    <button
                                                        key={font.value}
                                                        onClick={() => { updateSettings({ fontFamily: font.value }); setIsFontPickerOpen(false); }}
                                                        className={`px-3 py-2 rounded-lg text-xs text-left hover:bg-white/5 transition-all ${settings.fontFamily === font.value ? 'bg-brand-primary text-gray-900 font-bold' : 'text-gray-300'}`}
                                                        style={{ fontFamily: font.value }}
                                                    >
                                                        {font.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Font Size Selector */}
                                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                                        <button
                                            onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="text-[11px] font-bold text-brand-primary w-6 text-center">{settings.fontSize}</span>
                                        <button
                                            onClick={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                        >
                                            <span className="text-sm font-bold">+</span>
                                        </button>
                                    </div>

                                    {/* Text Color Picker (Matching Popup Style) */}
                                    <div className="flex items-center ml-1">
                                        <div className="relative w-8 h-8 rounded-full border-2 border-brand-primary/50 shadow-[0_0_10px_rgba(255,213,79,0.2)] overflow-hidden" style={{ backgroundColor: settings.textColor }}>
                                            <input
                                                type="color"
                                                value={settings.textColor}
                                                onChange={(e) => updateSettings({ textColor: e.target.value })}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                title="글꼴 색상"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Markup Tools (Only visible in markup mode) */}
                            {mode === 'markup' && (
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setTool('pen')}
                                        className={`p-2 rounded-lg transition-all ${currentTool === 'pen' ? 'bg-brand-primary text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        title="펜"
                                    >
                                        <PenTool size={20} />
                                    </button>
                                    <button
                                        onClick={() => setTool('highlight')}
                                        className={`p-2 rounded-lg transition-all ${currentTool === 'highlight' ? 'bg-brand-primary text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        title="형광펜"
                                    >
                                        <Highlighter size={20} />
                                    </button>
                                    <button
                                        onClick={() => setTool('eraser')}
                                        className={`p-2 rounded-lg transition-all ${currentTool === 'eraser' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                        title="지우개"
                                    >
                                        <Eraser size={20} />
                                    </button>

                                    <div className="w-px h-8 bg-white/10 mx-1" />

                                    {/* Color Picker */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                            style={{ color: currentColor }}
                                        >
                                            <Palette size={20} />
                                        </button>
                                        {isColorPickerOpen && (
                                            <div className="absolute bottom-full right-0 mb-4 bg-gray-800 shadow-2xl border border-white/10 rounded-xl p-2.5 grid grid-cols-4 gap-2 backdrop-blur-xl">
                                                {colors.map(color => (
                                                    <button
                                                        key={color.value}
                                                        onClick={() => { setColor(color.value); setIsColorPickerOpen(false); }}
                                                        className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-125 ${currentColor === color.value ? 'border-white scale-110 shadow-lg' : 'border-white/20'}`}
                                                        style={{ backgroundColor: color.value }}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { if (confirm('이 페이지의 모든 마킹을 지우시겠습니까?')) clearAllMarkups(); }}
                                        className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                                        title="모두 지우기"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleCollapse}
                                className="p-1 px-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-all ml-1 shrink-0"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
