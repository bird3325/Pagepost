export interface NoteHistoryEntry {
    content: string;
    updatedAt: number;
}

export interface Note {
    id: string;          // UUID v4
    url: string;         // 페이지 전체 URL
    domain: string;      // 도메인 (필터용)
    projectId?: string;   // 소속 프로젝트 ID

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
    status: 'pending' | 'in-progress' | 'done' | 'archived';
    priority?: 'low' | 'medium' | 'high';
    assignee?: string;
    isPinned: boolean;
    isCollapsed: boolean;

    // Per-note font settings
    fontFamily?: string;
    fontSize?: number;
    textColor?: string;

    createdAt: number;
    updatedAt: number;
    history?: NoteHistoryEntry[];

    // Sharing & Collaboration
    isShared?: boolean;
    shareId?: string;

    // Productivity & Media
    audioUrl?: string;     // URL or base64 of voice memo
    integrations?: {
        notionId?: string;
        slackTs?: string;
        trelloId?: string;
        syncedAt?: number;
    };

    // Canvas Dashboard Positioning
    canvasPosition?: {
        x: number;
        y: number;
    };
}

export type MarkupType = 'pen' | 'highlight' | 'rect' | 'circle' | 'arrow' | 'text' | 'sticker' | 'star' | 'heart' | 'triangle' | 'chat' | 'lightning' | 'diamond' | 'pentagon' | 'hexagon' | 'cross' | 'cloud' | 'banner' | 'burst1' | 'burst2' | 'eraser';

export interface MarkupObject {
    id: string;
    url: string;         // Normalized URL
    type: MarkupType;
    projectId?: string;   // 소속 프로젝트 ID

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

    anchor?: Note['anchor'];
    content?: string;     // For 'text' type
    linkedNoteId?: string; // Optional link to a Note

    // Sharing & Collaboration
    isShared?: boolean;
    shareId?: string;

    createdAt: number;
    updatedAt: number;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    color?: string;
    isPublic?: boolean;
    createdAt: number;
    updatedAt: number;
    integrations?: {
        notionDatabaseId?: string;
        slackChannelId?: string;
        trelloListId?: string;
    };
}
