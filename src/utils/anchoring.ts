/**
 * Triple Anchoring System Utilities
 */

import { type Note } from '../db';

/**
 * Generates a CSS selector for a given element.
 */
export function getCssSelector(el: HTMLElement): string {
    if (el.id) return `#${CSS.escape(el.id)}`;

    const path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.nodeName.toLowerCase();
        if (current.id) {
            selector += `#${CSS.escape(current.id)}`;
            path.unshift(selector);
            break;
        } else {
            let sibling = current.previousElementSibling;
            let nth = 1;
            while (sibling) {
                if (sibling.nodeName === current.nodeName) nth++;
                sibling = sibling.previousElementSibling;
            }
            selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
        current = current.parentElement;
    }
    return path.join(' > ');
}

/**
 * Generates an XPath for a given element.
 */
export function getXPath(el: HTMLElement): string {
    if (el.id) return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';

    let ix = 0;
    const siblings = el.parentNode ? Array.from(el.parentNode.childNodes) : [];
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i] as HTMLElement;
        if (sibling === el) {
            const parentXPath = el.parentNode ? getXPath(el.parentNode as HTMLElement) : '';
            return `${parentXPath}/${el.tagName.toLowerCase()}[${ix + 1}]`;
        }
        if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
    }
    return '';
}

/**
 * Captures the context info for an element at a given click coordinate.
 */
export function captureAnchor(el: HTMLElement, x: number, y: number): Note['anchor'] {
    const rect = el.getBoundingClientRect();
    const text = el.innerText || '';
    const fullText = document.body.innerText;
    const elementIndex = fullText.indexOf(text);

    const beforeText = fullText.substring(Math.max(0, elementIndex - 50), elementIndex);
    const afterText = fullText.substring(elementIndex + text.length, elementIndex + text.length + 50);

    return {
        dom: {
            selector: getCssSelector(el),
            xpath: getXPath(el),
        },
        context: {
            beforeText,
            afterText,
            elementText: text.substring(0, 200),
        },
        position: {
            x: (x - rect.left) / rect.width, // Relative % inside element
            y: (y - rect.top) / rect.height,
            scrollY: window.scrollY,
        }
    };
}

/**
 * Attempts to restore an element from anchor data.
 */
export function restoreElement(anchor: Note['anchor']): HTMLElement | null {
    // 1. Selector Match
    try {
        const el = document.querySelector(anchor.dom.selector) as HTMLElement;
        if (el) return el;
    } catch (e) { }

    // 2. XPath Match
    try {
        const result = document.evaluate(anchor.dom.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const el = result.singleNodeValue as HTMLElement;
        if (el) return el;
    } catch (e) { }

    // 3. Text Context Match (Advanced)
    const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, li, td, a');
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;

    const targetText = anchor.context.elementText.trim();
    if (!targetText) return null;

    for (const el of Array.from(allElements)) {
        const htmlEl = el as HTMLElement;
        // Skip elements with too many children to narrow down toleaf-ish nodes
        if (htmlEl.children.length > 5) continue;

        const elText = htmlEl.innerText || '';
        if (elText.includes(targetText)) {
            let score = 0;

            // Context matching score
            const fullText = document.body.innerText;
            const idx = fullText.indexOf(elText);
            if (idx !== -1) {
                const actualBefore = fullText.substring(Math.max(0, idx - 50), idx);
                const actualAfter = fullText.substring(idx + elText.length, idx + elText.length + 50);

                // Simple overlap calculation (could be improved with dice coefficient)
                if (actualBefore.includes(anchor.context.beforeText.substring(30))) score += 0.4;
                if (actualAfter.includes(anchor.context.afterText.substring(0, 20))) score += 0.4;
            }

            // Element text similarity score (higher if text is more unique)
            if (elText === targetText) score += 0.2;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = htmlEl;
            }
        }
    }

    // Only return if we have a reasonably confident match
    return bestScore > 0.3 ? bestMatch : null;
}
