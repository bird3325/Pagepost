/**
 * Utility to analyze the host page's theme and extract a suitable accent color.
 */

export const analyzePageTheme = (): string => {
    try {
        // 1. Check meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            const color = metaThemeColor.getAttribute('content');
            if (color && isValidColor(color)) return color;
        }

        // 2. Check header or nav background color
        const header = document.querySelector('header, nav, [role="banner"]');
        if (header) {
            const bgColor = window.getComputedStyle(header).backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                const hex = rgbToHex(bgColor);
                if (isGoodAccent(hex)) return hex;
            }
        }

        // 3. Fallback to a common brand color if it's a known site
        const host = window.location.hostname;
        if (host.includes('naver.com')) return '#03C75A'; // Naver Green
        if (host.includes('kakao.com')) return '#FEE500'; // Kakao Yellow
        if (host.includes('google.com')) return '#4285F4'; // Google Blue
        if (host.includes('github.com')) return '#24292f'; // GitHub Dark

    } catch (e) {
        console.error('PagePost: Theme analysis failed', e);
    }

    return '#FFD54F'; // Default Brand Yellow
};

const isValidColor = (color: string): boolean => {
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
};

const rgbToHex = (rgb: string): string => {
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Check if color is not too close to white or black to be a good accent
const isGoodAccent = (hex: string): boolean => {
    if (!hex.startsWith('#')) return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 30 && brightness < 220;
};
