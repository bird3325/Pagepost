import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { type MarkupType } from '../db';
import { StickyNote, PenTool, Highlighter, Eraser, Trash2, ChevronLeft, ChevronRight, Palette, Type, Minus, Camera, X, Square, Circle, ArrowRight, Undo2, Smile, Star, Heart, Triangle, MessageSquare, Zap, Diamond, Pentagon, Hexagon, Plus, Cloud, Flag, Sparkles, Flame } from 'lucide-react';

export const FloatingToolbar: React.FC = () => {
    const { mode, setMode, currentTool, setTool, currentColor, setColor, clearAllMarkups, undoMarkup, settings, updateSettings } = useNoteStore();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isVisible, setIsVisible] = useState(false);

    React.useEffect(() => {
        if (isExpanded) {
            // Trigger entrance animation
            const timer = setTimeout(() => setIsVisible(true), 50);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    const [isFontPickerOpen, setIsFontPickerOpen] = useState(false);
    const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
    const [isShapePickerOpen, setIsShapePickerOpen] = useState(false);
    const [selectedSticker, setSelectedSticker] = useState('✅');
    const [selectedShape, setSelectedShape] = useState<MarkupType>('rect');

    const stickers = ['✅', '❌', '⚠️', '💡', '📌', '❤️', '⭐', '🔥', '👍', '👎', '👏', '🚀'];
    const shapes = [
        { id: 'rect' as MarkupType, icon: <Square size={20} />, label: '사각형' },
        { id: 'circle' as MarkupType, icon: <Circle size={20} />, label: '원형' },
        { id: 'arrow' as MarkupType, icon: <ArrowRight size={20} />, label: '화살표' },
        { id: 'star' as MarkupType, icon: <Star size={20} />, label: '별' },
        { id: 'heart' as MarkupType, icon: <Heart size={20} />, label: '하트' },
        { id: 'triangle' as MarkupType, icon: <Triangle size={20} />, label: '삼각형' },
        { id: 'chat' as MarkupType, icon: <MessageSquare size={20} />, label: '말풍선' },
        { id: 'lightning' as MarkupType, icon: <Zap size={20} />, label: '번개' },
        { id: 'diamond' as MarkupType, icon: <Diamond size={20} />, label: '다이아몬드' },
        { id: 'pentagon' as MarkupType, icon: <Pentagon size={20} />, label: '오각형' },
        { id: 'hexagon' as MarkupType, icon: <Hexagon size={20} />, label: '육각형' },
        { id: 'cross' as MarkupType, icon: <Plus size={20} />, label: '십자가' },
        { id: 'cloud' as MarkupType, icon: <Cloud size={20} />, label: '구름' },
        { id: 'banner' as MarkupType, icon: <Flag size={20} />, label: '배너' },
        { id: 'burst1' as MarkupType, icon: <Sparkles size={20} />, label: '폭발1' },
        { id: 'burst2' as MarkupType, icon: <Flame size={20} />, label: '폭발2' }
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
        <div className="fixed bottom-10 inset-x-0 flex justify-center pointer-events-none z-[2147483640]">
            <div style={{ all: 'initial', boxSizing: 'border-box' }} className="pointer-events-auto">
                <div
                    className={`bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.6),0_0_25px_rgba(255,213,79,0.2)] border-2 border-brand-primary flex items-center box-border text-white whitespace-nowrap transition-all duration-500 ease-in-out ${isVisible
                        ? 'max-w-[min(800px,94vw)] h-18 rounded-3xl p-3 px-4 gap-3'
                        : 'max-w-[64px] h-16 rounded-full p-0 gap-0 border-brand-primary border-4'
                        }`}
                    style={{
                        fontStyle: 'normal',
                        fontFamily: 'Pretendard, system-ui, sans-serif',
                        position: 'relative',
                        overflow: isVisible ? 'visible' : 'hidden'
                    }}
                >
                    {isExpanded && isVisible && (
                        <button
                            onClick={() => { if (confirm('툴바를 숨기시겠습니까? 설정에서 다시 켤 수 있습니다.')) updateSettings({ showToolbar: false }); }}
                            style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                width: '28px',
                                height: '28px',
                                backgroundColor: 'white',
                                border: '2px solid #111827', // dark gray/black
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#111827',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                zIndex: 100,
                                transition: 'all 0.2s'
                            }}
                            className="hover:scale-110 hover:text-red-600"
                            title="툴바 닫기"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    )}
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
                                <button
                                    onClick={() => setMode('capture')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'capture' ? 'bg-brand-primary shadow-sm text-gray-900' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="캡쳐 모드"
                                >
                                    <Camera size={20} />
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

                                    {/* Shapes */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsShapePickerOpen(!isShapePickerOpen)}
                                            className={`p-2 rounded-lg transition-all ${['rect', 'circle', 'arrow'].includes(currentTool) ? 'bg-brand-primary text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            title="도형"
                                        >
                                            {shapes.find(s => s.id === selectedShape)?.icon || <Square size={20} />}
                                        </button>
                                        {isShapePickerOpen && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-gray-800 shadow-2xl border border-white/10 rounded-2xl p-2 grid grid-cols-4 gap-1 backdrop-blur-xl z-[100] w-48">
                                                {shapes.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setSelectedShape(s.id);
                                                            setTool(s.id);
                                                            setIsShapePickerOpen(false);
                                                        }}
                                                        className={`p-2 rounded-xl transition-all ${currentTool === s.id ? 'bg-brand-primary text-gray-900' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                        title={s.label}
                                                    >
                                                        {s.icon}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px h-8 bg-white/10 mx-1" />

                                    {/* Stickers */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
                                            className={`p-2 rounded-lg transition-all ${currentTool === 'sticker' ? 'bg-brand-primary text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            title="스티커"
                                        >
                                            <span className="text-xl leading-none">{currentTool === 'sticker' ? selectedSticker : <Smile size={20} />}</span>
                                        </button>
                                        {isStickerPickerOpen && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-gray-800 shadow-2xl border border-white/10 rounded-2xl p-3 grid grid-cols-4 gap-2 w-48 backdrop-blur-xl z-[100]">
                                                {stickers.map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => {
                                                            setSelectedSticker(s);
                                                            setTool('sticker');
                                                            setIsStickerPickerOpen(false);
                                                            // Store the selected sticker in a global hidden state if needed, or we'll pass it via MarkupLayer
                                                            (window as any).__pagepost_selected_sticker = s;
                                                        }}
                                                        className="text-2xl hover:bg-white/10 p-2 rounded-xl transition-all hover:scale-125"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px h-8 bg-white/10 mx-1" />

                                    <button
                                        onClick={() => undoMarkup()}
                                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                                        title="실행 취소 (Undo)"
                                    >
                                        <Undo2 size={20} />
                                    </button>

                                    {/* Thickness Selector */}
                                    {currentTool !== 'eraser' && (
                                        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                                            <button
                                                onClick={() => {
                                                    const key = currentTool === 'highlight' ? 'highlightWidth' : 'penWidth';
                                                    const min = currentTool === 'highlight' ? 5 : 1;
                                                    updateSettings({ [key]: Math.max(min, settings[key] - (currentTool === 'highlight' ? 5 : 1)) });
                                                }}
                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                                title="두께 감소"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <div className="flex flex-col items-center justify-center w-6 gap-0.5">
                                                <div
                                                    className="bg-brand-primary rounded-full"
                                                    style={{
                                                        width: Math.min(10, (currentTool === 'highlight' ? settings.highlightWidth / 4 : settings.penWidth * 1.5)),
                                                        height: Math.min(10, (currentTool === 'highlight' ? settings.highlightWidth / 4 : settings.penWidth * 1.5))
                                                    }}
                                                />
                                                <span className="text-[9px] font-bold text-brand-primary leading-none">
                                                    {currentTool === 'highlight' ? settings.highlightWidth : settings.penWidth}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const key = currentTool === 'highlight' ? 'highlightWidth' : 'penWidth';
                                                    const max = currentTool === 'highlight' ? 100 : 20;
                                                    updateSettings({ [key]: Math.min(max, settings[key] + (currentTool === 'highlight' ? 5 : 1)) });
                                                }}
                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                                title="두께 증가"
                                            >
                                                <span className="text-sm font-bold">+</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Color Palette Picker (System Color Picker) */}
                                    <div className="flex items-center ml-1">
                                        <div className="relative w-8 h-8 rounded-full border-2 border-brand-primary/50 shadow-[0_0_10px_rgba(255,213,79,0.2)] flex items-center justify-center overflow-hidden transition-transform hover:scale-110" style={{ backgroundColor: currentColor }}>
                                            <Palette size={14} className="text-white mix-blend-difference pointer-events-none" />
                                            <input
                                                type="color"
                                                value={currentColor}
                                                onChange={(e) => setColor(e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                title="마크업 색상"
                                            />
                                        </div>
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
                                title="접기"
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
