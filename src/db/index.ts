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

    createdAt: number;
    updatedAt: number;
}
