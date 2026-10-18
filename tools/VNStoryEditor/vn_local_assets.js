/* Local preview assets: File references only; never persisted or embedded in story data. */
window.VNLocalAssets = (() => {
    'use strict';
    const files = new Map(), aliases = new Map(), urls = new Map();
    const normalize = s => String(s || '').replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
    const stem = s => normalize(s).replace(/\.[^/.]+$/, '');
    let version = 0;
    const supported = file => /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(file.name);
    function indexEntry(entry) {
        const parts = entry.path.split('/');
        const keys = new Set();
        for (let i = 0; i < parts.length; i++) {
            const suffix = parts.slice(i).join('/'); keys.add(suffix); keys.add(stem(suffix));
        }
        for (const key of keys) {
            if (!aliases.has(key)) aliases.set(key, new Set());
            aliases.get(key).add(entry);
        }
    }
    function reindex() { aliases.clear(); for (const entry of files.values()) indexEntry(entry); }
    function notify() { version++; document.dispatchEvent(new Event('vn-assets-changed')); }
    function add(list, category = 'auto') {
        let count = 0;
        for (const file of list) {
            if (!supported(file)) continue;
            const path = normalize(file.webkitRelativePath || file.name);
            const key = category + ':' + path;
            const old = files.get(key);
            if (old && urls.has(old)) { URL.revokeObjectURL(urls.get(old)); urls.delete(old); }
            const kind = category === 'auto' ? /(^|\/)(backgrounds?)(\/)/.test(path) ? 'background' : /(^|\/)cg\//.test(path) ? 'cg' : /(^|\/)dialogueimages?\//.test(path) ? 'dialogue' : 'character' : category;
            files.set(key, {file, path, kind}); count++;
        }
        reindex(); notify(); return count;
    }
    function candidates(name) { return [...(aliases.get(normalize(name)) || aliases.get(stem(name)) || [])]; }
    function resolve(name, kind) {
        if (!name) return null;
        let found = candidates(name);
        const direct = found.filter(e => !e.path.includes('/') && e.kind === kind);
        if (direct.length === 1) return direct[0];
        const typed = found.filter(e => e.kind === kind);
        if (typed.length) found = typed;
        return found.length === 1 ? found[0] : null; // Ambiguous names must never select an arbitrary file.
    }
    function character(state, library) {
        if (!state?.characterId) return null;
        const character = library[state.characterId];
        const outfit = character?.outfits?.find(o => String(o.outfitID) === String(state.outfitID));
        const pose = outfit?.poses?.find(p => String(p.poseID) === String(state.poseID));
        const expression = pose?.expressions?.[Number(state.expressionIndex || 0)];
        if (!expression?.fileName) return null;
        let found = candidates(expression.fileName);
        const names = [state.characterId, character.characterName].filter(Boolean).map(normalize);
        const scoped = found.filter(e => {
            const parts = e.path.split('/');
            return parts.slice(0, -3).some(p => names.includes(p)) &&
                (parts.at(-3) === String(state.outfitID) || parts.at(-3)?.startsWith(state.outfitID + '_')) &&
                (parts.at(-2) === String(state.poseID) || parts.at(-2)?.startsWith(state.poseID + '_'));
        });
        if (scoped.length) found = scoped;
        // Never fall back to another character's folder if scoped paths are present.
        else if (found.some(e => e.path.split('/').length >= 4)) return null;
        return found.length === 1 ? found[0] : null;
    }
    function url(entry) {
        if (!entry) return null;
        if (!urls.has(entry)) urls.set(entry, URL.createObjectURL(entry.file));
        else { const value = urls.get(entry); urls.delete(entry); urls.set(entry, value); }
        return urls.get(entry);
    }
    function trim() {
        // Keep only a small LRU of object URLs; always retain images currently displayed.
        const inUse = new Set([...document.querySelectorAll('img[src^="blob:"]')].map(img => img.src));
        for (const [entry, value] of urls) {
            if (urls.size <= 24) break;
            if (!inUse.has(value)) { URL.revokeObjectURL(value); urls.delete(entry); }
        }
    }
    function image(entry, alt, className = '') {
        const img = document.createElement('img'); img.alt = alt; img.className = className;
        img.decoding = 'async'; img.loading = 'lazy'; img.src = url(entry);
        img.onerror = () => { img.alt = `Unable to decode: ${entry.file.name}`; img.classList.add('asset-error'); };
        return img;
    }
    function clear() {
        for (const value of urls.values()) URL.revokeObjectURL(value);
        urls.clear(); files.clear(); aliases.clear(); notify();
    }
    function importEmbedded(name, dataURL, kind = 'background') {
        // Legacy JSON images are accepted in memory, without localStorage or FileReader encoding.
        const match = /^data:(image\/[^;,]+);base64,(.*)$/s.exec(dataURL || '');
        if (!match) return;
        try {
            const raw = atob(match[2]), bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
            add([new File([bytes], name + '.png', {type: match[1]})], kind);
        } catch { /* Invalid embedded image does not prevent loading chapter text. */ }
    }
    window.addEventListener('pagehide', () => { for (const value of urls.values()) URL.revokeObjectURL(value); urls.clear(); });
    return {add, resolve, character, url, image, trim, clear, importEmbedded,
        get version() { return version; },
        stats: () => ({files: files.size, objectURLs: urls.size}),
        normalize};
})();
