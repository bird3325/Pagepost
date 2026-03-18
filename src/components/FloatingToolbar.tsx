import React, { useState } from 'react';
import { useNoteStore } from '../store/useNoteStore';
import { type MarkupType } from '../db';
import { StickyNote, PenTool, Highlighter, Eraser, Trash2, ChevronLeft, Palette, Type, Minus, Camera, X, Square, Circle, ArrowRight, Undo2, Smile, Star, Heart, Triangle, MessageSquare, Zap, Diamond, Pentagon, Hexagon, Plus, Cloud, Flag, Sparkles, Flame, MousePointer2, Eye, EyeOff, LayoutList, Map } from 'lucide-react';

export const FloatingToolbar: React.FC = () => {
    const { mode, setMode, currentTool, setTool, currentColor, setColor, clearAllMarkups, undoMarkup, settings, updateSettings, selectedMarkupId, updateMarkup, markups, setOpacity, accentColor } = useNoteStore();
    const [isExpanded, setIsExpanded] = useState(settings.isToolbarExpanded);
    const [isVisible, setIsVisible] = useState(settings.isToolbarExpanded);
    const [isDragging, setIsDragging] = useState(false);
    const toolbarRef = React.useRef<HTMLDivElement>(null);
    const dragInfo = React.useRef({ isDragging: false, startX: 0, startY: 0, initialX: 50, initialY: 88 });

    // Synchronize visibility with isExpanded changes (for animations)
    React.useEffect(() => {
        setIsVisible(isExpanded);
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
            updateSettings({ isToolbarExpanded: false });
        }, 500);
    };

    const handleDragStart = (e: React.MouseEvent) => {
        // In expanded mode, only drag if clicking the background, not buttons (tools)
        // In collapsed mode, we allow dragging on the main button but check for distance on mouseUp to handle clicks
        if (isExpanded && (e.target as HTMLElement).closest('button')) return;

        e.preventDefault();
        const currentPos = settings.toolbarPosition || { x: 50, y: 88 };
        dragInfo.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            initialX: currentPos.x,
            initialY: currentPos.y
        };
        setIsDragging(true);

        const handleMouseMove = (ev: MouseEvent) => {
            if (!dragInfo.current.isDragging) return;

            const dx = ev.clientX - dragInfo.current.startX;
            const dy = ev.clientY - dragInfo.current.startY;

            // Calculate movement in percentage of viewport
            const px = (dx / window.innerWidth) * 100;
            const py = (dy / window.innerHeight) * 100;

            let newX = dragInfo.current.initialX + px;
            let newY = dragInfo.current.initialY + py;

            // Viewport clamping based on actual toolbar size
            if (toolbarRef.current) {
                const rect = toolbarRef.current.getBoundingClientRect();
                const halfWPct = (rect.width / 2 / window.innerWidth) * 100;
                const halfHPct = (rect.height / 2 / window.innerHeight) * 100;
                newX = Math.max(halfWPct, Math.min(100 - halfWPct, newX));
                newY = Math.max(halfHPct, Math.min(100 - halfHPct, newY));

                toolbarRef.current.style.left = `${newX}%`;
                toolbarRef.current.style.top = `${newY}%`;
            }
        };

        const handleMouseUp = (ev: MouseEvent) => {
            if (!dragInfo.current.isDragging) return;
            dragInfo.current.isDragging = false;
            setIsDragging(false);

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            const dx = ev.clientX - dragInfo.current.startX;
            const dy = ev.clientY - dragInfo.current.startY;

            // Check if it was a real drag or just a click
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5 && !isExpanded) {
                // It was a short click on the collapsed toolbar => expand it
                setIsExpanded(true);
                updateSettings({ isToolbarExpanded: true });
                // Reset position to the last saved one to avoid tiny offset shifts from the "click"
                if (toolbarRef.current) {
                    toolbarRef.current.style.left = `${dragInfo.current.initialX}%`;
                    toolbarRef.current.style.top = `${dragInfo.current.initialY}%`;
                }
                return;
            }

            const px = (dx / window.innerWidth) * 100;
            const py = (dy / window.innerHeight) * 100;

            let finalX = dragInfo.current.initialX + px;
            let finalY = dragInfo.current.initialY + py;

            // Final clamp for saving based on actual toolbar size
            if (toolbarRef.current) {
                const rect = toolbarRef.current.getBoundingClientRect();
                const halfWPct = (rect.width / 2 / window.innerWidth) * 100;
                const halfHPct = (rect.height / 2 / window.innerHeight) * 100;
                finalX = Math.max(halfWPct, Math.min(100 - halfWPct, finalX));
                finalY = Math.max(halfHPct, Math.min(100 - halfHPct, finalY));
            }

            updateSettings({ toolbarPosition: { x: finalX, y: finalY } });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const toolbarPos = settings.toolbarPosition || { x: 50, y: 88 };
    const isVertical = toolbarPos.x < 15 || toolbarPos.x > 85;

    return (
        <div
            ref={toolbarRef}
            onMouseDown={handleDragStart}
            className="fixed flex justify-center pointer-events-none z-[300] select-none"
            style={{
                left: `${toolbarPos?.x ?? 50}%`,
                top: `${toolbarPos?.y ?? 88}%`,
                transform: 'translate(-50%, -50%)',
                transition: isDragging ? 'none' : 'left 0.3s ease-out, top 0.3s ease-out',
                '--accent-color': accentColor
            } as any}
        >
            <div style={{ all: 'initial', boxSizing: 'border-box' }} className="pointer-events-auto">
                <div
                    className={`bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border-2 flex ${isVertical ? 'flex-col' : 'flex-row'} items-center box-border text-white whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${settings.isCleanView ? 'opacity-40 hover:opacity-100' : ''} ${isVisible
                        ? (isVertical ? 'w-18 max-h-[98vh] h-fit rounded-3xl p-2.5 px-1.5 gap-1.5' : 'w-fit max-w-[98vw] h-18 rounded-3xl p-1.5 px-2.5 gap-1.5')
                        : 'w-16 h-16 rounded-2xl p-0 gap-0 border-0'
                        }`}
                    style={{
                        backgroundColor: isVisible ? '#111827' : accentColor,
                        borderColor: isVisible ? accentColor : 'transparent',
                        boxShadow: isVisible
                            ? `0 20px 60px rgba(0,0,0,0.6), 0 0 25px ${accentColor}33`
                            : '0 10px 30px rgba(0,0,0,0.25), inset 0 -4px 10px rgba(0,0,0,0.1)',
                        fontStyle: 'normal',
                        fontFamily: 'Pretendard, system-ui, sans-serif',
                        position: 'relative',
                        overflow: (isVisible || !isExpanded) ? 'visible' : 'hidden',
                        opacity: settings.toolbarOpacity,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        transform: !isVisible && !isDragging ? 'rotate(-2deg)' : 'none'
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
                        <div className="relative w-full h-full flex items-center justify-center group/collapsed overflow-visible">
                            {/* The "Folded Corner" element */}
                            <div
                                className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-lg"
                                style={{
                                    background: `linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.15) 50%)`,
                                    filter: 'blur(0.5px)'
                                }}
                            />
                            <div
                                className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-lg"
                                style={{
                                    background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 50%)`,
                                    transform: 'scale(1.05)',
                                    zIndex: 1
                                }}
                            />

                            <div
                                className="flex items-center justify-center hover:scale-110 transition-all duration-300 cursor-pointer p-2 rounded-xl"
                                style={{ color: '#111827' }}
                                title="Open Tools"
                            >
                                <LayoutList size={28} strokeWidth={2.5} />
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); if (confirm('Hide toolbar? You can re-enable it in settings.')) updateSettings({ showToolbar: false }); }}
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: 'white',
                                    border: '1.5px solid #111827',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#111827',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                    zIndex: 101,
                                    transition: 'all 0.2s'
                                }}
                                className="hover:scale-110 hover:text-red-600 opacity-0 group-hover/collapsed:opacity-100"
                                title="Close"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ) : (
                        <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-2 transition-all duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
                            {/* Mode Toggle */}
                            <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} bg-white/10 rounded-xl p-1 border border-white/5 shrink-0`}>
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
                                <button
                                    onClick={() => setMode('review')}
                                    className={`p-2 rounded-lg transition-all ${mode === 'review' ? 'bg-brand-primary shadow-sm text-gray-900' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="리뷰 모드"
                                >
                                    <LayoutList size={20} />
                                </button>
                            </div>

                            <button
                                onClick={() => updateSettings({ isCleanView: !settings.isCleanView })}
                                className={`p-2.5 rounded-xl transition-all border shrink-0 ${settings.isCleanView ? 'bg-white/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                style={settings.isCleanView ? {
                                    borderColor: accentColor,
                                    color: accentColor,
                                    backgroundColor: `${accentColor}22`
                                } : {}}
                                title={settings.isCleanView ? "클린 뷰 끄기" : "클린 뷰 켜기 (요소 투명화)"}
                            >
                                {settings.isCleanView ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>

                            <button
                                onClick={() => updateSettings({ showMiniMap: !settings.showMiniMap })}
                                className={`p-2.5 rounded-xl transition-all border shrink-0 ${settings.showMiniMap ? 'bg-white/10' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                                style={settings.showMiniMap ? {
                                    borderColor: accentColor,
                                    color: accentColor,
                                    backgroundColor: `${accentColor}22`
                                } : {}}
                                title={settings.showMiniMap ? "미니맵 끄기" : "미니맵 켜기 (우측 가이드)"}
                            >
                                <Map size={20} />
                            </button>

                            <div className={`${isVertical ? 'w-8 h-px my-1' : 'w-px h-8 mx-1'} bg-white/10 shrink-0`} />

                            {/* Note Tools (Only visible in note mode) */}
                            {mode === 'note' && (
                                <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-2 items-center`}>
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
                                                        className={`px-3 py-2 rounded-lg text-xs text-left hover:bg-white/5 transition-all ${settings.fontFamily === font.value ? 'text-gray-900 font-bold' : 'text-gray-300'}`}
                                                        style={{
                                                            fontFamily: font.value,
                                                            backgroundColor: settings.fontFamily === font.value ? accentColor : 'transparent'
                                                        }}
                                                    >
                                                        {font.name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Font Size Selector */}
                                    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5`}>
                                        <button
                                            onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="text-[11px] font-bold w-6 text-center" style={{ color: accentColor }}>{settings.fontSize}</span>
                                        <button
                                            onClick={() => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shadow-sm"
                                        >
                                            <span className="text-sm font-bold">+</span>
                                        </button>
                                    </div>

                                    {/* Text Color Picker (Matching Popup Style) */}
                                    <div className="flex items-center ml-1">
                                        <div className="relative w-8 h-8 rounded-full border-2 shadow-[0_0_10px_rgba(255,213,79,0.2)] overflow-hidden"
                                            style={{ backgroundColor: settings.textColor, borderColor: `${accentColor}80` }}>
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
                                <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} gap-1 items-center`}>
                                    {/* Tool Group 1: Basic Tools */}
                                    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} bg-white/5 rounded-xl p-1 border border-white/5 items-center`}>
                                        <button
                                            onClick={() => setTool('pen')}
                                            className={`p-1.5 rounded-lg transition-all ${currentTool === 'pen' ? 'text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            style={currentTool === 'pen' ? { backgroundColor: accentColor } : {}}
                                            title="펜"
                                        >
                                            <PenTool size={18} />
                                        </button>
                                        <button
                                            onClick={() => setTool('highlight')}
                                            className={`p-1.5 rounded-lg transition-all ${currentTool === 'highlight' ? 'text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            style={currentTool === 'highlight' ? { backgroundColor: accentColor } : {}}
                                            title="형광펜"
                                        >
                                            <Highlighter size={18} />
                                        </button>
                                        <button
                                            onClick={() => setTool('eraser')}
                                            className={`p-1.5 rounded-lg transition-all ${currentTool === 'eraser' ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            title="지우개"
                                        >
                                            <Eraser size={18} />
                                        </button>
                                        <button
                                            onClick={() => setTool('select')}
                                            className={`p-1.5 rounded-lg transition-all ${currentTool === 'select' ? 'text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                            style={currentTool === 'select' ? { backgroundColor: accentColor } : {}}
                                            title="선택 및 수정"
                                        >
                                            <MousePointer2 size={18} />
                                        </button>
                                    </div>

                                    {/* Tool Group 2: Shapes & Stickers */}
                                    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} bg-white/5 rounded-xl p-1 border border-white/5 items-center gap-0.5`}>
                                        <div className="relative">
                                            <button
                                                onClick={() => setIsShapePickerOpen(!isShapePickerOpen)}
                                                className={`p-1.5 rounded-lg transition-all ${['rect', 'circle', 'arrow', 'star', 'heart', 'triangle', 'chat', 'lightning', 'diamond', 'pentagon', 'hexagon', 'cross', 'cloud', 'banner'].includes(currentTool) ? 'text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                style={['rect', 'circle', 'arrow', 'star', 'heart', 'triangle', 'chat', 'lightning', 'diamond', 'pentagon', 'hexagon', 'cross', 'cloud', 'banner'].includes(currentTool) ? { backgroundColor: accentColor } : {}}
                                                title="도형"
                                            >
                                                {shapes.find(s => s.id === selectedShape)?.icon || <Square size={18} />}
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
                                                            className={`p-2 rounded-xl transition-all ${currentTool === s.id ? 'text-gray-900' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                            style={currentTool === s.id ? { backgroundColor: accentColor } : {}}
                                                            title={s.label}
                                                        >
                                                            {s.icon}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={() => setIsStickerPickerOpen(!isStickerPickerOpen)}
                                                className={`p-1.5 rounded-lg transition-all ${currentTool === 'sticker' ? 'text-gray-900' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                style={currentTool === 'sticker' ? { backgroundColor: accentColor } : {}}
                                                title="스티커"
                                            >
                                                <span className="text-lg leading-none">{currentTool === 'sticker' ? selectedSticker : <Smile size={18} />}</span>
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
                                    </div>

                                    {/* Action Group: Settings & History */}
                                    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} bg-white/5 rounded-xl p-1 border border-white/5 items-center gap-1`}>
                                        <button
                                            onClick={() => undoMarkup()}
                                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all shrink-0"
                                            title="실행 취소 (Undo)"
                                        >
                                            <Undo2 size={18} />
                                        </button>

                                        {/* Thickness Selector */}
                                        {currentTool !== 'eraser' && (
                                            <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/5 shadow-inner shrink-0`}>
                                                <button
                                                    onClick={() => {
                                                        const key = currentTool === 'highlight' ? 'highlightWidth' : 'penWidth';
                                                        const min = currentTool === 'highlight' ? 5 : 1;
                                                        const newValue = Math.max(min, (settings as any)[key] - (currentTool === 'highlight' ? 5 : 1));
                                                        updateSettings({ [key]: newValue });

                                                        if (selectedMarkupId) {
                                                            const markup = markups.find(m => m.id === selectedMarkupId);
                                                            if (markup) {
                                                                updateMarkup(selectedMarkupId, { style: { ...markup.style, strokeWidth: newValue } });
                                                            }
                                                        }
                                                    }}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-all"
                                                    title="두께 감소"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="flex flex-col items-center justify-center w-5">
                                                    <span className="text-[9px] font-bold leading-none" style={{ color: accentColor }}>
                                                        {currentTool === 'highlight' ? settings.highlightWidth : settings.penWidth}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const key = currentTool === 'highlight' ? 'highlightWidth' : 'penWidth';
                                                        const max = currentTool === 'highlight' ? 100 : 20;
                                                        const newValue = Math.min(max, (settings as any)[key] + (currentTool === 'highlight' ? 5 : 1));
                                                        updateSettings({ [key]: newValue });

                                                        if (selectedMarkupId) {
                                                            const markup = markups.find(m => m.id === selectedMarkupId);
                                                            if (markup) {
                                                                updateMarkup(selectedMarkupId, { style: { ...markup.style, strokeWidth: newValue } });
                                                            }
                                                        }
                                                    }}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-all"
                                                    title="두께 증가"
                                                >
                                                    <span className="text-xs font-bold">+</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Opacity Selector */}
                                        {currentTool !== 'eraser' && (
                                            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 border border-white/5 shadow-inner shrink-0">
                                                <button
                                                    onClick={() => setOpacity(Math.max(0.1, settings.markupOpacity - 0.1))}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-all"
                                                    title="투명도 감소"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <div className="flex flex-col items-center justify-center w-7" title="마크업 투명도">
                                                    <span className="text-[9px] font-bold leading-none" style={{ color: accentColor }}>
                                                        {Math.round(settings.markupOpacity * 100)}%
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setOpacity(Math.min(1.0, settings.markupOpacity + 0.1))}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-all"
                                                    title="투명도 증가"
                                                >
                                                    <span className="text-xs font-bold">+</span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Color Palette Picker */}
                                        <div className="flex items-center px-0.5">
                                            <div className="relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden transition-transform hover:scale-110 shrink-0"
                                                style={{ backgroundColor: currentColor, borderColor: `${accentColor}80` }}>
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
                                            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all shrink-0"
                                            title="모두 지우기"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
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
            </div >
        </div >
    );
};
