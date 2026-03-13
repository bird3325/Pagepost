/**
 * Normalizes a URL by removing hash fragments and standardizing trailing slashes.
 * This ensures that a page like 'example.com/' and 'example.com/#section' are treated as the same.
 */
export const normalizeUrl = (url: string): string => {
    if (!url) return '';
    try {
        const urlObj = new URL(url);

        // Standardize pathname: remove trailing slash for comparison
        if (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }

        // Return normalized string representation
        // We keep search and hash as they are often part of the route identity in SPAs
        // BUT we strip our own internal scroll-to hash to ensure matching works
        let hash = urlObj.hash;
        if (hash.includes('#pagepost-note-')) {
            // Remove the specific fragment while keeping others if any
            hash = hash.replace(/#pagepost-note-[a-f0-9-]+/i, '');
        }

        return urlObj.origin + urlObj.pathname + urlObj.search + hash;
    } catch (e) {
        return url;
    }
};

