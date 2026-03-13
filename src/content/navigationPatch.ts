(function () {
    if ((window as any).__PAGEPOST_NAVIGATION_PATCH_LOADED__) return;
    (window as any).__PAGEPOST_NAVIGATION_PATCH_LOADED__ = true;

    const pushState = history.pushState;
    const replaceState = history.replaceState;

    history.pushState = function () {
        pushState.apply(history, arguments as any);
        window.dispatchEvent(new CustomEvent('pagepost-url-change', { detail: window.location.href }));
    };

    history.replaceState = function () {
        replaceState.apply(history, arguments as any);
        window.dispatchEvent(new CustomEvent('pagepost-url-change', { detail: window.location.href }));
    };

    window.addEventListener('popstate', function () {
        window.dispatchEvent(new CustomEvent('pagepost-url-change', { detail: window.location.href }));
    });

    console.log('PagePost: Main world History API patched (CSP-compliant)');
})();
