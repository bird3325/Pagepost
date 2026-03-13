export interface Note {
    id: string;          // UUID v4
    url: string;         // 페이지 전체 URL
    domain: string;      // 도메인 (필터용)

    anchor: {
        dom: {
            selector: string;
            xpath: string;
        };
        context: {
            beforeText: string;
            afterText: string;
            elementText: string;
        };
        position: {
            x: number;       // Viewport relative %
            y: number;       // Viewport relative %
            scrollY: number;
        };
    };

    content: string;
    color: string;
    size: {
        width: number;
        height: number;
    };
    notePosition: {      // Physical position of the sticky note
        x: number;
        y: number;
    };

    tags: string[];
    status: 'active' | 'done' | 'archived';
    isPinned: boolean;
    isCollapsed: boolean;

    // Per-note font settings
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;

    createdAt: number;
    updatedAt: number;
}

export type MarkupType = 'pen' | 'highlight' | 'rect' | 'circle' | 'arrow' | 'text';

export interface MarkupObject {
    id: string;
    url: string;         // Normalized URL
    type: MarkupType;

    // For 'pen' and 'highlight', we store points. 
    // For others, we might store bounds or start/end points.
    points?: { x: number; y: number }[];
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    style: {
        strokeColor: string;
        strokeWidth: number;
        opacity: number;
        fontFamily?: string;  // For 'text' type
        fontSize?: number;    // For 'text' type
    };

    content?: string;     // For 'text' type
    linkedNoteId?: string; // Optional link to a Note

    createdAt: number;
    updatedAt: number;
}
