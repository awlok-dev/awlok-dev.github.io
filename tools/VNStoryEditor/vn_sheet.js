/* Spreadsheet workspace. Uses the original chapter model and JSON/asset editors. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));
    const field = (key, label, type = 'text', options) => ({ key, label, type, options });
    const groups = {
        story: [field('speakingCharacterId', 'Speaker'), field('dialogue', 'Dialogue', 'multiline'), field('isNarration', 'Narration', 'boolean'), field('cameraRange', 'Camera', 'select', CameraRanges), field('backgroundSprite', 'Background'), field('dialogueDelay', 'Delay (s)', 'number')],
        staging: [field('dialogue', 'Dialogue', 'multiline'), ...['left', 'center', 'right'].flatMap(pos => [field(`${pos}Character.action`, `${pos} · Action`, 'select', CharacterActions), field(`${pos}Character.characterId`, `${pos} · Character`), field(`${pos}Character.outfitID`, `${pos} · Outfit`), field(`${pos}Character.poseID`, `${pos} · Pose`), field(`${pos}Character.expressionIndex`, `${pos} · Expression`), field(`${pos}Character.symbolType`, `${pos} · Symbol`, 'select', ExpressionSymbols)]), field('cgAction', 'CG action', 'select', CGActions), field('cgSprite', 'CG sprite'), field('dialogueImageSprite', 'Dialogue image')],
        audio: [field('dialogue', 'Dialogue', 'multiline'), field('showSoundOptions', 'Sound enabled', 'boolean'), field('bgmAction', 'BGM action', 'select', SoundActions), field('backgroundMusic', 'Music'), field('ambientAction', 'Ambient action', 'select', SoundActions), field('ambientSound', 'Ambience'), field('soundEffect', 'Sound effect'), field('characterVoice', 'Voice')],
        logic: [field('dialogue', 'Dialogue', 'multiline'), field('commands', 'Commands (one per line)', 'lines'), field('hasChoices', 'Choices enabled', 'boolean'), field('choicesDelay', 'Choice delay (s)', 'number'), field('showGameEvents', 'Events enabled', 'boolean')]
    };
    const allFields = [...new Map(Object.values(groups).flat().map(f => [f.key, f])).values()];
    let group = 'story', mode = 'sheet', query = '', filter = 'all', active = 0;
    let selected = new Set(), visible = [], past = [], future = [];
    let trackedChapter = chapter, snapshot = JSON.stringify(chapter);
    const originalRender = renderNodeTable;
    const originalSelect = selectNode;
    selectNode = function(index) { activate(index); originalSelect(index); };
    for (const name of ['deleteNode', 'duplicateNode', 'handleDrop', 'clearAllNodes']) {
        const fn = window[name];
        window[name] = function(...args) { selected.clear(); return fn.apply(this, args); };
    }
    const originalHead = $('nodeTable').tHead.innerHTML;
    const originalSave = autoSaveChapter;
    const originalTitle = updateChapterTitleBar;
    let page = 0;
    let pageSize = 100;
    let virtualStart = -1;
    const virtualRowHeight = 110;
    let sceneFrames = [], previewFrame = 0, stageKey = null, stageElement = null;
    const get = (obj, path) => path.split('.').reduce((v, k) => v?.[k], obj);
    function set(obj, path, value) {
        const keys = path.split('.');
        const last = keys.pop();
        for (const key of keys) obj = obj[key] ||= {};
        obj[last] = value;
    }
    function element(tag, text, className) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (className) el.className = className;
        return el;
    }
    function button(text, fn, title) {
        const el = element('button', text);
        el.type = 'button'; el.onclick = fn;
        if (title) el.title = title;
        return el;
    }
    function tell(message) { $('sheetNotice').textContent = message; }
    function syncChapter() {
        if (trackedChapter === chapter) return;
        trackedChapter = chapter; snapshot = JSON.stringify(chapter);
        past = []; future = []; selected.clear(); active = 0; page = 0; sceneFrames = [];
        $('nextChapter').value = chapter.nextChapter || '';
    }
    function record() {
        syncChapter();
        const next = JSON.stringify(chapter);
        if (next !== snapshot) {
            past.push(snapshot); if (past.length > 60) past.shift();
            future = []; snapshot = next;
        }
        $('sheetUndo').disabled = !past.length;
        $('sheetRedo').disabled = !future.length;
    }
    autoSaveChapter = function() { originalSave(); record(); sceneFrames = []; renderPreview(); updateStatus(); };
    updateChapterTitleBar = function() { originalTitle(); if ($('sheetStatus')) updateStatus(); };
    function updateStatus() {
        $('sheetStatus').textContent = hasUnsavedChanges ? 'Unsaved changes · Ctrl/Cmd + S to save' : currentChapterId ? 'Saved in this browser' : 'New chapter · not saved';
        $('sheetStatus').classList.toggle('unsaved', hasUnsavedChanges);
        $('sheetCount').textContent = `${chapter.nodes.length} lines · ${selected.size} selected`;
    }
    function history(direction) {
        const source = direction === 'undo' ? past : future;
        if (!source.length) return;
        (direction === 'undo' ? future : past).push(JSON.stringify(chapter));
        chapter = JSON.parse(source.pop()); trackedChapter = chapter; snapshot = JSON.stringify(chapter);
        selected.clear(); currentNodeIndex = null;
        $('editorModal').classList.remove('active');
        for (const key of ['storyName', 'chapterName', 'fileName', 'nextChapter']) $(key).value = chapter[key] || '';
        originalSave(); sceneFrames = []; renderNodeTable();
        tell(direction === 'undo' ? 'Change undone.' : 'Change restored.');
    }
    function mutate(fn, message) {
        fn(); autoSaveChapter(); renderNodeTable(); if (message) tell(message);
    }
    function coerce(value, f) {
        if (f.type === 'boolean') {
            if (!/^(true|false|1|0|yes|no)?$/i.test(value.trim())) throw Error(`${f.label}: use true or false.`);
            return /^(true|1|yes)$/i.test(value.trim());
        }
        if (f.type === 'number') {
            const n = Number(value);
            if (!Number.isFinite(n) || n < 0) throw Error(`${f.label}: use a non-negative number.`);
            return n;
        }
        if (f.type === 'select' && !f.options.includes(value)) throw Error(`${f.label}: choose ${f.options.join(', ')}.`);
        return f.type === 'lines' ? value.split(/\r?\n/).filter(x => x.trim()) : value;
    }
    const textValue = (node, f) => f.type === 'lines' ? (get(node, f.key) || []).join('\n') : String(get(node, f.key) ?? '');
    function focusCell(index, col) {
        let input = document.querySelector(`[data-row="${index}"][data-col="${col}"]`);
        if (!input && pageSize === Number.MAX_SAFE_INTEGER && visible.includes(index)) {
            document.querySelector('.node-table-container').scrollTop = visible.indexOf(index) * virtualRowHeight; renderNodeTable();
            input = document.querySelector(`[data-row="${index}"][data-col="${col}"]`);
        }
        if (input) { input.focus(); input.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
    function activate(index) {
        active = index;
        document.querySelector('.sheet-row.is-current')?.classList.remove('is-current');
        document.querySelector(`.sheet-row[data-index="${active}"]`)?.classList.add('is-current');
        renderPreview();
    }
    function makeCell(node, index, f, col) {
        const td = element('td'); td.dataset.fillRow = index; td.dataset.fillCol = col;
        let input;
        if (f.type === 'select') {
            input = element('select');
            for (const option of f.options) input.add(new Option(option, option));
            if (!f.options.includes(get(node, f.key)) && get(node, f.key) != null) input.add(new Option(get(node, f.key), get(node, f.key)));
        } else if (['multiline', 'lines'].includes(f.type)) {
            input = element('textarea'); input.rows = 3;
        } else {
            input = element('input'); input.type = f.type === 'boolean' ? 'checkbox' : f.type === 'number' ? 'number' : 'text';
            if (f.type === 'number') { input.min = 0; input.step = 'any'; }
        }
        input.className = 'sheet-cell'; input.dataset.row = index; input.dataset.col = col;
        input.setAttribute('aria-label', `Line ${index + 1}: ${f.label}`);
        if (f.type === 'boolean') input.checked = !!get(node, f.key);
        else input.value = textValue(node, f);
        if (f.key.endsWith('characterId') || f.key === 'speakingCharacterId') input.setAttribute('list', 'sheetSpeakers');
        input.onfocus = () => activate(index);
        input.oninput = () => {
            try {
                const value = f.type === 'boolean' ? input.checked : coerce(input.value, f);
                set(node, f.key, value);
                if (/Character\.|backgroundSprite|cgAction|cgSprite/.test(f.key)) sceneFrames.length = Math.min(sceneFrames.length, index);
                input.setCustomValidity('');
                originalSave(); renderPreview(); updateStatus();
            } catch (err) { input.setCustomValidity(err.message); }
        };
        input.onchange = () => {
            if (!input.checkValidity()) { input.reportValidity(); input.value = textValue(node, f); input.setCustomValidity(''); }
            autoSaveChapter();
        };
        input.onkeydown = event => {
            if (event.isComposing) return;
            if (event.key === 'Enter' && !event.shiftKey && input.tagName !== 'SELECT' && input.type !== 'checkbox') {
                event.preventDefault(); input.blur();
                const next = visible.indexOf(index) + (event.ctrlKey || event.metaKey ? -1 : 1);
                if (visible[next] !== undefined) {
                    page = Math.floor(next / pageSize); renderNodeTable(); focusCell(visible[next], col);
                } else if (!query && filter === 'all') {
                    mutate(() => { chapter.nodes.push(createEmptyNode()); active = chapter.nodes.length - 1; page = Math.floor(active / pageSize); });
                    focusCell(active, col);
                }
            }
        };
        input.onpaste = event => {
            const text = event.clipboardData.getData('text/plain');
            // A plain multiline paragraph belongs in its cell. Tabs indicate a sheet rectangle.
            if (!text.includes('\t')) return;
            event.preventDefault();
            try { pasteRectangle(parseDelimited(text, '\t'), index, col); } catch (err) { tell(err.message); }
        };
        td.append(input);
        const handle = button('', () => {}, 'Drag up or down to copy this cell. Escape cancels.');
        handle.className = 'fill-handle'; handle.tabIndex = -1; handle.setAttribute('aria-label', `Fill from line ${index + 1}: ${f.label}`);
        handle.onpointerdown = event => beginFill(event, index, col, handle); td.append(handle);
        if (f.key === 'dialogue') td.className = 'dialogue-cell';
        return td;
    }
    function matchingRows() {
        return chapter.nodes.map((_, i) => i).filter(i => {
            const node = chapter.nodes[i];
            const match = !query || [node.dialogue, node.speakingCharacterId, getCharacterNameById(node.speakingCharacterId), node.backgroundSprite, ...(node.commands || [])].some(v => String(v || '').toLowerCase().includes(query));
            return match && (filter === 'all' || filter === 'choices' && node.hasChoices || filter === 'narration' && node.isNarration || filter === 'empty' && !node.dialogue?.trim());
        });
    }
    renderNodeTable = function() {
        syncChapter();
        if (mode === 'classic') {
            $('nodeTable').tHead.innerHTML = originalHead;
            originalRender(); updateStatus(); renderPreview(); return;
        }
        const savedScroll = document.querySelector('.node-table-container').scrollTop;
        const table = $('nodeTable'); table.tHead.replaceChildren();
        const header = element('tr');
        const checkHead = element('th');
        const all = element('input'); all.type = 'checkbox'; all.setAttribute('aria-label', 'Select all matching lines');
        visible = matchingRows();
        all.checked = visible.length > 0 && visible.every(i => selected.has(i));
        all.indeterminate = !all.checked && visible.some(i => selected.has(i));
        all.onchange = () => { visible.forEach(i => all.checked ? selected.add(i) : selected.delete(i)); renderNodeTable(); };
        checkHead.append(all); header.append(checkHead, element('th', 'Line'));
        for (const f of groups[group]) header.append(element('th', f.label));
        header.append(element('th', 'Details')); table.tHead.append(header);
        const body = $('nodeTableBody'); body.replaceChildren();
        const fragment = document.createDocumentFragment();
        page = Math.max(0, Math.min(page, Math.ceil(visible.length / pageSize) - 1));
        const box = document.querySelector('.node-table-container');
        const virtual = pageSize === Number.MAX_SAFE_INTEGER && visible.length > 250;
        box.classList.toggle('virtual-all', virtual);
        const start = virtual ? Math.max(0, Math.floor(Math.max(0, savedScroll - 55) / virtualRowHeight) - 10) : page * pageSize;
        const end = virtual ? Math.min(visible.length, start + Math.ceil(box.clientHeight / virtualRowHeight) + 24) : Math.min(visible.length, (page + 1) * pageSize);
        virtualStart = virtual ? start : -1;
        const spacer = height => {
            const row = element('tr'), td = element('td'); row.className = 'virtual-spacer'; td.colSpan = groups[group].length + 3;
            td.style.height = `${height}px`; row.setAttribute('aria-hidden', 'true'); row.append(td); return row;
        };
        if (virtual && start) fragment.append(spacer(start * virtualRowHeight));
        for (const index of visible.slice(start, end)) {
            const node = chapter.nodes[index], row = element('tr', undefined, 'sheet-row'); row.dataset.index = index;
            row.classList.toggle('is-current', active === index); row.classList.toggle('is-selected', selected.has(index));
            const selectTd = element('td'), check = element('input'); check.type = 'checkbox'; check.checked = selected.has(index);
            check.setAttribute('aria-label', `Select line ${index + 1}`);
            check.onchange = () => { check.checked ? selected.add(index) : selected.delete(index); renderNodeTable(); };
            selectTd.append(check);
            const indexTd = element('td'); indexTd.append(button(String(index + 1).padStart(2, '0'), () => activate(index), `Preview line ${index + 1} · Unity index ${index}`));
            const drag = button('⠿', () => {}, 'Drag to reorder this line or the selected lines');
            drag.className = 'row-drag'; drag.draggable = true; drag.setAttribute('aria-label', `Drag line ${index + 1}`);
            drag.ondragstart = event => startRowDrag(event, index); drag.ondragend = endRowDrag;
            row.ondragover = event => overRow(event, row); row.ondrop = event => dropRow(event, row);
            indexTd.append(drag);
            row.append(selectTd, indexTd);
            groups[group].forEach((f, col) => row.append(makeCell(node, index, f, col)));
            const details = element('td', undefined, 'sheet-details');
            details.append(button('Edit details ↗', () => selectNode(index), 'All original node settings: choices, events, images, colors and characters'));
            const tags = [];
            if (node.hasChoices) tags.push(`${node.choiceList?.choices?.length || 0} choices`);
            if (node.commands?.length) tags.push(`${node.commands.length} commands`);
            if (node.cgAction !== 'None' && node.cgAction) tags.push(`CG ${node.cgAction}`);
            details.append(element('small', tags.join(' · ')));
            row.append(details); fragment.append(row);
        }
        if (virtual && end < visible.length) fragment.append(spacer((visible.length - end) * virtualRowHeight));
        body.append(fragment);
        box.scrollTop = savedScroll;
        if (!visible.length) {
            const row = element('tr'), td = element('td'); td.colSpan = groups[group].length + 3;
            const empty = element('div', undefined, 'sheet-empty');
            empty.append(element('h2', chapter.nodes.length ? 'No matching lines' : 'Every story starts with a line.'), element('p', chapter.nodes.length ? 'Clear the search or change your filter.' : 'Write directly in the sheet, import a chapter, or paste a script to begin.'));
            empty.append(button(chapter.nodes.length ? 'Clear filters' : '+ Write first line', () => chapter.nodes.length ? resetFilters() : addNode()));
            td.append(empty); row.append(td); body.append(row);
        }
        $('sheetPage').textContent = visible.length ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, visible.length)} of ${visible.length} matching lines` : '0 lines';
        $('pageBack').disabled = !page; $('pageNext').disabled = (page + 1) * pageSize >= visible.length;
        $('sheetUndo').disabled = !past.length; $('sheetRedo').disabled = !future.length;
        updateStatus(); renderPreview();
    };
    function resetFilters() { query = ''; filter = 'all'; $('sheetSearch').value = ''; $('sheetFilter').value = 'all'; page = 0; renderNodeTable(); }
    addNode = function() {
        resetFilters();
        mutate(() => { chapter.nodes.push(createEmptyNode()); active = chapter.nodes.length - 1; page = Math.floor(active / pageSize); }, 'Line added. Start typing, then press Enter for the next line.');
        if (mode === 'classic') selectNode(active); else focusCell(active, Math.max(0, groups[group].findIndex(f => f.key === 'dialogue')));
    };
    function bulk(action) {
        const indexes = [...selected].sort((a, b) => a - b);
        if (!indexes.length) return tell('Select one or more lines using the checkboxes first.');
        if (action === 'delete' && !confirm(`Delete ${indexes.length} selected line(s)? You can undo this.`)) return;
        mutate(() => {
            if (action === 'delete') { chapter.nodes = chapter.nodes.filter((_, i) => !selected.has(i)); selected.clear(); }
            if (action === 'duplicate') {
                const next = [], picked = new Set();
                chapter.nodes.forEach((node, i) => { next.push(node); if (selected.has(i)) { picked.add(next.length); next.push(clone(node)); } });
                chapter.nodes = next; selected = picked;
            }
            if (action === 'up' || action === 'down') {
                const order = action === 'up' ? indexes : [...indexes].reverse(), delta = action === 'up' ? -1 : 1;
                for (const i of order) {
                    const j = i + delta;
                    if (j >= 0 && j < chapter.nodes.length && !selected.has(j)) {
                        [chapter.nodes[i], chapter.nodes[j]] = [chapter.nodes[j], chapter.nodes[i]]; selected.delete(i); selected.add(j);
                    }
                }
            }
            currentNodeIndex = null; active = Math.min(active, chapter.nodes.length - 1);
        }, 'Selection updated. Undo is available.');
    }
    function parseDelimited(text, delimiter) {
        text = text.replace(/^\uFEFF/, '');
        const rows = []; let row = [], cell = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (c === '"') {
                if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
                else if (quoted || !cell.length) quoted = !quoted;
                else cell += c;
            } else if (!quoted && c === delimiter) { row.push(cell); cell = ''; }
            else if (!quoted && (c === '\n' || c === '\r')) {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += c;
        }
        if (quoted) throw Error('Unclosed quoted cell. Check the CSV or pasted text.');
        if (cell.length || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }
    function pasteRectangle(rows, startIndex, startCol) {
        const cols = groups[group];
        if (rows.some(r => r.length + startCol > cols.length)) throw Error('Paste has more columns than this view. Choose the matching column tab first.');
        const start = visible.indexOf(startIndex);
        const targets = rows.map((_, i) => visible[start + i]);
        if (targets.some(i => i === undefined) && (query || filter !== 'all')) throw Error('Paste exceeds filtered lines. Clear filters to append new lines.');
        const converted = rows.map(row => row.map((value, i) => coerce(value, cols[startCol + i])));
        mutate(() => {
            converted.forEach((row, r) => {
                let index = targets[r];
                if (index === undefined) { index = chapter.nodes.length; chapter.nodes.push(createEmptyNode()); }
                row.forEach((value, c) => set(chapter.nodes[index], cols[startCol + c].key, value));
            });
        }, `Pasted ${rows.length} line(s). Existing advanced settings are preserved.`);
        focusCell(startIndex, startCol);
    }
    function exportCSV() {
        const fields = groups[group], rows = [['nodeIndex', ...fields.map(f => f.key)], ...visible.map(i => [i, ...fields.map(f => textValue(chapter.nodes[i], f))])];
        const csv = rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        const a = element('a'); a.href = url; a.download = `${chapter.fileName || 'chapter'}-${group}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        tell('CSV exported for visible lines and this column tab. JSON remains the full Unity export.');
    }
    function importCSV(text) {
        const rows = parseDelimited(text, ',');
        const headers = rows.shift();
        if (headers?.every(key => key === 'nodeIndex')) throw Error('CSV needs at least one editable column.');
        if (!headers?.length || rows.length === 0) throw Error('CSV needs a header and at least one data row.');
        if (new Set(headers).size !== headers.length) throw Error('Duplicate CSV headers.');
        const fields = headers.map(key => key === 'nodeIndex' ? null : allFields.find(f => f.key === key));
        if (fields.some((f, i) => !f && headers[i] !== 'nodeIndex')) throw Error('Unknown CSV column. Use headers from Export CSV.');
        const indexCol = headers.indexOf('nodeIndex'), seen = new Set();
        const changes = rows.map(row => {
            if (row.length !== headers.length) throw Error('CSV row width does not match the header.');
            const raw = indexCol < 0 ? '' : row[indexCol];
            const index = raw === '' ? null : Number(raw);
            if (index !== null && (!/^\d+$/.test(raw) || index >= chapter.nodes.length || seen.has(index))) throw Error('nodeIndex must be a unique existing zero-based index, or blank to append.');
            if (index !== null) seen.add(index);
            return { index, values: row.map((v, i) => fields[i] ? coerce(v, fields[i]) : null) };
        });
        if (!confirm(`Apply ${changes.length} CSV row(s) to this chapter? Existing rows are matched by nodeIndex; blank indexes append. Undo is available.`)) return;
        mutate(() => changes.forEach(change => {
            const node = change.index === null ? createEmptyNode() : chapter.nodes[change.index];
            fields.forEach((f, i) => { if (f) set(node, f.key, change.values[i]); });
            if (change.index === null) chapter.nodes.push(node);
        }), `Applied ${changes.length} CSV row(s). Other fields were preserved.`);
    }
    function pasteScript() {
        const dialog = $('scriptDialog'); $('scriptText').value = ''; $('scriptError').textContent = ''; dialog.showModal(); $('scriptText').focus();
    }
    function appendScript() {
        const text = $('scriptText').value;
        if (!text.trim()) return;
        const rows = text.includes('\t') ? parseDelimited(text, '\t') : text.split(/\r?\n/).filter(x => x.trim()).map(line => ['', line]);
        if (rows.some(row => row.length !== 2)) return $('scriptError').textContent = 'Use two tab-separated columns: speaker and dialogue.';
        resetFilters();
        mutate(() => {
            active = chapter.nodes.length;
            rows.forEach(([speaker, dialogue]) => { const node = createEmptyNode(); node.speakingCharacterId = speaker; node.dialogue = dialogue; node.isNarration = !speaker; chapter.nodes.push(node); });
            page = Math.floor(active / pageSize);
        }, `Added ${rows.length} script lines.`);
        $('scriptDialog').close();
    }
    function replaceText() {
        const find = $('replaceFind').value, replacement = $('replaceWith').value;
        if (!find) return;
        const targets = selected.size ? [...selected] : visible;
        if (!confirm(`Replace exact text in the dialogue of ${targets.length} ${selected.size ? 'selected' : 'matching'} lines?`)) return;
        let count = 0;
        mutate(() => targets.forEach(i => { const node = chapter.nodes[i]; if ((node.dialogue || '').includes(find)) { node.dialogue = node.dialogue.split(find).join(replacement); count++; } }), `Replaced text in ${count} lines.`);
        tell(`Replaced text in ${count} lines.`);
    }
    // Preview requests coalesce to one render per animation frame. Stage images survive text edits.
    function renderPreview() {
        if (previewFrame) return;
        previewFrame = requestAnimationFrame(() => { previewFrame = 0; buildPreview(); });
    }
    function sceneAt(index) {
        for (let i = sceneFrames.length; i <= index; i++) {
            const previous = sceneFrames[i - 1] || {bg: '', cg: '', states: {}};
            const scene = {bg: previous.bg, cg: previous.cg, states: {...previous.states}};
            const node = chapter.nodes[i];
            if (node.backgroundSprite) scene.bg = node.backgroundSprite;
            if (node.cgAction === 'Show') scene.cg = node.cgSprite;
            if (node.cgAction === 'Hide') scene.cg = '';
            for (const pos of ['left', 'center', 'right']) {
                const state = node[`${pos}Character`];
                if (state?.action === 'Exit') delete scene.states[pos];
                else if (state?.action === 'Enter' || state?.action === 'ChangeOutfitExpression') scene.states[pos] = {...scene.states[pos], ...state};
            }
            sceneFrames.push(scene);
        }
        return sceneFrames[index];
    }
    function debugFields(value, path, body) {
        if (value !== null && typeof value === 'object' && Object.keys(value).length) {
            for (const key of Object.keys(value)) debugFields(value[key], path ? `${path}.${key}` : key, body);
            return;
        }
        const row = element('tr'); row.append(element('th', path), element('td', value === '' ? '(empty)' : JSON.stringify(value) ?? '(undefined)')); body.append(row);
    }
    function buildPreview() {
        const pane = $('sheetPreview'); if (!pane) return;
        const oldScroll = pane.scrollTop;
        // Reuse the actual image DOM when the scene has not changed.
        if (stageElement?.isConnected) stageElement.remove();
        pane.replaceChildren();
        active = Math.max(0, Math.min(active, chapter.nodes.length - 1));
        const node = chapter.nodes[active];
        const top = element('div', undefined, 'preview-top'); top.append(element('span', 'READING PREVIEW / DEBUG'), element('span', node ? `${active + 1} / ${chapter.nodes.length}` : '—')); pane.append(top);
        if (!node) { pane.append(element('p', 'Your dialogue preview appears here as you write.', 'preview-hint')); VNLocalAssets.trim(); return; }
        const scene = sceneAt(active);
        const key = JSON.stringify([scene, VNLocalAssets.version, Object.values(scene.states).map(state => [getCharacterNameById(state.characterId), VNLocalAssets.character(state, characterLibrary)?.path])]);
        if (stageKey !== key) {
            stageKey = key;
            stageElement = element('div', undefined, 'preview-stage');
            const entry = VNLocalAssets.resolve(scene.cg || scene.bg, scene.cg ? 'cg' : 'background');
            if (entry) stageElement.append(VNLocalAssets.image(entry, scene.cg || scene.bg, 'scene-background'));
            stageElement.append(element('span', scene.cg ? `CG · ${scene.cg}` : scene.bg ? `BG · ${scene.bg}${entry ? '' : ' · local image missing or ambiguous'}` : 'No background', 'stage-label'));
            const cast = element('div', undefined, 'preview-cast');
            for (const pos of ['left', 'center', 'right']) {
                const state = scene.states[pos], slot = element('div', undefined, 'cast-slot');
                slot.append(element('small', pos));
                if (state) {
                    const entry = VNLocalAssets.character(state, characterLibrary);
                    if (entry) slot.append(VNLocalAssets.image(entry, `${pos}: ${state.characterId}`, 'cast-image'));
                    else slot.append(element('small', 'Local sprite not linked'));
                    slot.append(element('strong', getCharacterNameById(state.characterId) || state.characterId || 'Character'), element('small', `ID: ${state.characterId}`), element('small', `Outfit ${state.outfitID} / Pose ${state.poseID} / Expr ${state.expressionIndex}`));
                } else slot.append(element('span', '—'));
                cast.append(slot);
            }
            stageElement.append(cast);
        }
        pane.append(stageElement);
        const dialogue = element('div', undefined, 'preview-dialogue');
        const name = element('h3', node.isNarration ? 'Narrator' : getCharacterNameById(node.speakingCharacterId) || node.speakingCharacterId || 'Unnamed speaker');
        const content = element('p', node.dialogue || 'Start writing this line…');
        const cssColor = c => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 1})`;
        if (node.useSpecificNameColor && node.specificNameColor) name.style.color = cssColor(node.specificNameColor);
        if (node.useSpecificDialogueColor && node.specificDialogueColor) content.style.color = cssColor(node.specificDialogueColor);
        dialogue.append(name, content); pane.append(dialogue);
        const dialogueImage = VNLocalAssets.resolve(node.dialogueImageSprite, 'dialogue');
        if (dialogueImage) pane.append(VNLocalAssets.image(dialogueImage, node.dialogueImageSprite, 'preview-inline-image'));
        if (node.hasChoices) {
            const choices = element('div', undefined, 'preview-choices');
            for (const choice of node.choiceList?.choices || []) {
                const item = button(`${choice.choiceText || '(empty choice)'} → ${choice.nextChapterName || 'Continue'}`, () => {
                    if (choice.nextChapterName) tell(`Branch target: ${choice.nextChapterName}. Open that chapter in Browse Chapters. Commands are not executed.`);
                    else activate(Math.min(active + 1, chapter.nodes.length - 1));
                }); item.disabled = choice.isEnabled === false; choices.append(item);
            }
            pane.append(choices);
        }
        const nav = element('div', undefined, 'preview-nav');
        const prev = button('← Previous', () => activate(active - 1)), next = button('Next →', () => activate(active + 1));
        prev.disabled = active <= 0; next.disabled = active >= chapter.nodes.length - 1;
        nav.append(prev, button('Edit details', () => selectNode(active)), next); pane.append(nav);
        const resolved = element('section', undefined, 'debug-section'); resolved.append(element('h3', 'Resolved scene (including earlier lines)'));
        const resolvedTable = element('table'), resolvedBody = element('tbody');
        const stateInfo = {backgroundSprite: scene.bg, cgSprite: scene.cg, speakingCharacterName: getCharacterNameById(node.speakingCharacterId) || '', speakingCharacterId: node.speakingCharacterId || ''};
        for (const pos of ['left', 'center', 'right']) {
            const state = scene.states[pos];
            stateInfo[pos] = state ? {...state, characterName: getCharacterNameById(state.characterId) || '', localFile: VNLocalAssets.character(state, characterLibrary)?.path || '(missing or ambiguous)'} : '(empty)';
        }
        debugFields(stateInfo, '', resolvedBody); resolvedTable.append(resolvedBody); resolved.append(resolvedTable); pane.append(resolved);
        const debug = element('section', undefined, 'debug-section'); debug.id = 'nodeDebug'; debug.append(element('h3', `Every node setting · Unity index ${active}`), element('p', 'Stored values, including disabled options, empty fields and custom properties.'));
        const table = element('table'), body = element('tbody'); debugFields(node, '', body); table.append(body); debug.append(table); pane.append(debug);
        const raw = element('details', undefined, 'debug-raw'); raw.append(element('summary', 'Exact node JSON'), element('pre', JSON.stringify(node, null, 2))); pane.append(raw);
        pane.append(element('p', 'Local file preview only. Audio, animations, game events and commands are shown for inspection, not executed.', 'preview-hint'));
        pane.scrollTop = oldScroll;
        VNLocalAssets.trim();
    }
    let rowDrag = null;
    function startRowDrag(event, index) {
        document.activeElement?.blur();
        if (query || filter !== 'all') { event.preventDefault(); tell('Clear filters before dragging rows, so the destination is unambiguous.'); return; }
        rowDrag = selected.has(index) ? [...selected].sort((a, b) => a - b) : [index];
        event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', 'vn-story-rows');
        for (const i of rowDrag) document.querySelector(`.sheet-row[data-index="${i}"]`)?.classList.add('row-dragging');
    }
    function endRowDrag() {
        rowDrag = null;
        document.querySelectorAll('.row-dragging,.drop-before,.drop-after').forEach(el => el.classList.remove('row-dragging', 'drop-before', 'drop-after'));
    }
    function overRow(event, row) {
        if (!rowDrag) return;
        event.preventDefault(); event.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.drop-before,.drop-after').forEach(el => el.classList.remove('drop-before', 'drop-after'));
        const bounds = row.getBoundingClientRect(); row.classList.add(event.clientY < bounds.top + bounds.height / 2 ? 'drop-before' : 'drop-after');
        const box = document.querySelector('.node-table-container'), rect = box.getBoundingClientRect();
        if (event.clientY < rect.top + 50) box.scrollTop -= 30;
        if (event.clientY > rect.bottom - 50) box.scrollTop += 30;
    }
    function dropRow(event, row) {
        if (!rowDrag) return;
        event.preventDefault();
        const indices = [...rowDrag], dragged = new Set(indices);
        const bounds = row.getBoundingClientRect();
        const boundary = Number(row.dataset.index) + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0);
        const activeNode = chapter.nodes[active];
        const moving = indices.map(i => chapter.nodes[i]);
        const remaining = chapter.nodes.filter((_, i) => !dragged.has(i));
        const insertion = boundary - indices.filter(i => i < boundary).length;
        endRowDrag();
        mutate(() => {
            remaining.splice(insertion, 0, ...moving); chapter.nodes = remaining;
            selected = new Set(moving.map(node => chapter.nodes.indexOf(node)));
            active = chapter.nodes.indexOf(activeNode); currentNodeIndex = null;
        }, `Moved ${moving.length} line(s). Undo is available.`);
    }
    function beginFill(event, index, col, handle) {
        if (event.button !== 0) return;
        event.preventDefault(); event.stopPropagation(); document.activeElement?.blur();
        const source = clone(get(chapter.nodes[index], groups[group][col].key) ?? (groups[group][col].type === 'lines' ? [] : groups[group][col].type === 'boolean' ? false : ''));
        const start = visible.indexOf(index); let end = start, y = event.clientY, x = event.clientX, raf = 0;
        const box = document.querySelector('.node-table-container');
        box.setPointerCapture(event.pointerId);
        function paint() {
            document.querySelectorAll('.fill-range').forEach(el => el.classList.remove('fill-range'));
            for (const i of visible.slice(Math.min(start, end), Math.max(start, end) + 1)) document.querySelector(`[data-fill-row="${i}"][data-fill-col="${col}"]`)?.classList.add('fill-range');
        }
        function update() {
            const bounds = box.getBoundingClientRect();
            const cell = document.elementFromPoint(x, Math.max(bounds.top + 55, Math.min(y, Math.min(bounds.bottom, innerHeight) - 4)))?.closest('[data-fill-row]');
            if (cell) { const next = visible.indexOf(Number(cell.dataset.fillRow)); if (next >= 0 && next !== end) { end = next; paint(); } }
        }
        function tick() {
            const bounds = box.getBoundingClientRect();
            if (y < bounds.top + 65) box.scrollTop -= 16;
            else if (y > Math.min(bounds.bottom, innerHeight) - 30) box.scrollTop += 16;
            update(); raf = requestAnimationFrame(tick);
        }
        function move(e) { x = e.clientX; y = e.clientY; update(); }
        function finish(apply) {
            cancelAnimationFrame(raf);
            box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', up); box.removeEventListener('pointercancel', cancel);
            document.removeEventListener('keydown', escape, true); window.removeEventListener('blur', cancel);
            if (box.hasPointerCapture(event.pointerId)) box.releasePointerCapture(event.pointerId);
            document.querySelectorAll('.fill-range').forEach(el => el.classList.remove('fill-range'));
            if (apply && end !== start) {
                const indexes = visible.slice(Math.min(start, end), Math.max(start, end) + 1);
                mutate(() => indexes.forEach(i => set(chapter.nodes[i], groups[group][col].key, clone(source))), `Filled ${indexes.length - 1} cell(s). Undo restores the entire fill.`);
                focusCell(index, col);
            }
        }
        const up = () => finish(true), cancel = () => finish(false);
        const escape = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(false); } };
        box.addEventListener('pointermove', move); box.addEventListener('pointerup', up); box.addEventListener('pointercancel', cancel);
        document.addEventListener('keydown', escape, true); window.addEventListener('blur', cancel);
        paint(); raf = requestAnimationFrame(tick);
    }
    function setupAssets() {
        const dialog = element('dialog'); dialog.id = 'localAssetsDialog';
        dialog.innerHTML = `<h2>Local image previews</h2><p>Link files from your computer. Images stay local and are not saved in browser storage or exported in JSON. Reconnect your folder after refreshing.</p><label>Image type <select id="assetKind"><option value="auto">Auto / complete asset folder</option><option value="background">Backgrounds</option><option value="character">Characters</option><option value="cg">CGs</option><option value="dialogue">Dialogue images</option></select></label><div class="asset-actions"><label class="sheet-file">Link folder<input id="assetFolder" type="file" webkitdirectory multiple hidden></label><label class="sheet-file">Link image files<input id="assetFiles" type="file" accept="image/*" multiple hidden></label></div><p>Backgrounds match sprite filenames. Characters use your library's expression filename and CharacterName/OutfitID_Name/PoseID_Name folders. Duplicate filenames require matching folders; ambiguous images stay unresolved.</p><div id="assetDrop" tabindex="0">Drop image files here, or use Link folder for a directory.</div><p id="assetStatus" role="status"></p><div class="asset-actions"><button id="assetClear">Unlink all images</button><button id="assetCleanLegacy">Remove old stored image caches</button><button id="assetClose">Done</button></div>`;
        document.body.append(dialog);
        const update = () => {
            $('assetStatus').textContent = `${VNLocalAssets.stats().files} linked files · previews load on demand`;
            stageKey = null; renderPreview();
            if ($('editorModal').classList.contains('active') && chapter.nodes[currentNodeIndex]) {
                const n = chapter.nodes[currentNodeIndex];
                loadBackgroundPreviewFromCache(n.backgroundSprite); loadCGPreviewFromCache(n.cgSprite); loadDialogueImagePreviewFromCache(n.dialogueImageSprite);
            }
        };
        document.addEventListener('vn-assets-changed', update);
        const link = list => { const count = VNLocalAssets.add([...list], $('assetKind').value); tell(`${count} local image(s) linked. No image data saved in browser storage.`); };
        for (const id of ['assetFiles', 'assetFolder']) $(id).onchange = event => { link(event.target.files); event.target.value = ''; };
        $('assetDrop').ondragover = e => e.preventDefault();
        $('assetDrop').ondrop = e => { e.preventDefault(); link(e.dataTransfer.files); };
        $('assetClear').onclick = () => VNLocalAssets.clear();
        $('assetCleanLegacy').onclick = () => {
            if (!confirm('Remove only the old background, CG and dialogue-image caches? Chapters and character definitions are kept.')) return;
            for (const key of [BACKGROUND_CACHE_KEY, CG_CACHE_KEY, DIALOGUE_IMAGE_CACHE_KEY]) localStorage.removeItem(key);
            $('assetStatus').textContent = 'Old image caches removed. Chapters and character definitions were kept.';
        };
        $('assetClose').onclick = () => dialog.close();
        update();
    }

    function setup() {
        document.body.classList.add('sheet-workspace');
        document.querySelector('.header h1').innerHTML = '<span class="brand-mark">VN</span> Story studio <small>VISUAL NOVEL EDITOR</small>';
        const version = document.querySelector('meta[name="vn-editor-version"]')?.content;
        if (version) {
            const badge = element('span', version, 'tool-version');
            badge.title = 'Tool release: YYYYMMDD.daily revision (Hong Kong date)';
            document.querySelector('.header h1').append(badge);
        }
        const content = document.querySelector('.content-area');
        const bar = element('section', undefined, 'sheet-toolbar');
        bar.innerHTML = `<div class="sheet-toolbar-top"><div><h2>Write the scene.</h2><p>Edit in place. Keep the story in view.</p></div><div class="sheet-actions"><button id="sheetUndo" title="Undo (Ctrl/Cmd + Z)">↶ Undo</button><button id="sheetRedo" title="Redo (Ctrl/Cmd + Shift + Z)">↷ Redo</button><button id="scriptPaste">Paste script</button><button id="csvExport">Export CSV</button><label class="sheet-file">Import CSV<input id="csvImport" type="file" accept=".csv,text/csv" hidden></label></div></div>
        <div class="sheet-controls"><div class="sheet-tabs" role="group" aria-label="Column groups"><button data-group="story">Story</button><button data-group="staging">Characters & visuals</button><button data-group="audio">Audio</button><button data-group="logic">Choices & commands</button></div><input id="sheetSearch" type="search" placeholder="Search dialogue, speaker, background…" aria-label="Search story"><select id="sheetFilter" aria-label="Filter lines"><option value="all">All lines</option><option value="choices">With choices</option><option value="narration">Narration</option><option value="empty">Empty dialogue</option></select><select id="sheetMode" aria-label="Editor view"><option value="sheet">Sheet view</option><option value="classic">Classic view</option></select><button id="previewToggle" aria-pressed="true">Preview</button></div>
        <div class="sheet-bulk"><span id="sheetCount"></span><button data-bulk="duplicate">Duplicate</button><button data-bulk="up">Move ↑</button><button data-bulk="down">Move ↓</button><button data-bulk="delete">Delete</button><details><summary>Find & replace</summary><div><input id="replaceFind" placeholder="Find exact text" aria-label="Find exact dialogue text"><input id="replaceWith" placeholder="Replace with" aria-label="Replacement text"><button id="replaceApply">Replace dialogue</button><small>Selected lines, or all search matches. Case-sensitive.</small></div></details></div>`;
        content.before(bar);
        const preview = element('aside'); preview.id = 'sheetPreview'; preview.setAttribute('aria-label', 'Live reading preview'); content.append(preview);
        const footer = element('footer', undefined, 'sheet-footer');
        footer.innerHTML = `<div><span id="sheetStatus"></span><span id="sheetNotice" role="status">Tab moves across cells · Enter moves down · Shift+Enter adds a new paragraph · Paste cells from a spreadsheet</span></div><div><label>Rows <select id="pageSize" aria-label="Rows per page"><option value="50">50</option><option value="100" selected>100</option><option value="250">250</option><option value="all">All</option></select></label><button id="pageBack">←</button><span id="sheetPage"></span><button id="pageNext">→</button></div>`;
        content.after(footer);
        const dialog = element('dialog'); dialog.id = 'scriptDialog';
        dialog.innerHTML = `<h2>Bring your script in.</h2><p>Paste two columns from a spreadsheet: <b>Speaker → Dialogue</b>. Or paste plain text: each non-empty line becomes narration. New lines are appended.</p><textarea id="scriptText" aria-label="Script to append" placeholder="Paste your story here…"></textarea><p id="scriptError" role="alert"></p><div><button id="scriptCancel">Cancel</button><button id="scriptAppend">Append lines</button></div>`; document.body.append(dialog);
        const speakers = element('datalist'); speakers.id = 'sheetSpeakers'; document.body.append(speakers);
        const refreshSpeakers = () => { speakers.replaceChildren(); Object.values(characterLibrary).forEach(c => { const o = element('option'); o.value = c.characterId; o.label = c.characterName; speakers.append(o); }); };
        refreshSpeakers(); document.addEventListener('focusin', e => { if (e.target.getAttribute('list') === 'sheetSpeakers') refreshSpeakers(); });
        $('sheetUndo').onclick = () => history('undo'); $('sheetRedo').onclick = () => history('redo');
        $('scriptPaste').onclick = pasteScript; $('scriptCancel').onclick = () => dialog.close(); $('scriptAppend').onclick = appendScript;
        $('csvExport').onclick = exportCSV;
        $('csvImport').onchange = async event => { const file = event.target.files[0]; if (!file) return; try { importCSV(await file.text()); } catch (err) { tell(err.message); } event.target.value = ''; };
        $('sheetSearch').oninput = event => { query = event.target.value.toLowerCase(); page = 0; document.querySelector('.node-table-container').scrollTop = 0; renderNodeTable(); };
        $('sheetFilter').onchange = event => { filter = event.target.value; page = 0; renderNodeTable(); };
        $('sheetMode').onchange = event => { mode = event.target.value; document.body.classList.toggle('classic-mode', mode === 'classic'); renderNodeTable(); };
        $('previewToggle').onclick = () => { const hidden = content.classList.toggle('preview-hidden'); $('previewToggle').setAttribute('aria-pressed', String(!hidden)); };
        document.querySelectorAll('[data-group]').forEach(btn => { btn.onclick = () => { group = btn.dataset.group; renderTabs(); renderNodeTable(); }; });
        document.querySelectorAll('[data-bulk]').forEach(btn => { btn.onclick = () => bulk(btn.dataset.bulk); });
        $('replaceApply').onclick = replaceText;
        $('pageSize').onchange = event => { document.querySelector('.node-table-container').scrollTop = 0; pageSize = event.target.value === 'all' ? Number.MAX_SAFE_INTEGER : Number(event.target.value); page = 0; renderNodeTable(); };
        $('pageBack').onclick = () => { page--; renderNodeTable(); }; $('pageNext').onclick = () => { page++; renderNodeTable(); };
        document.addEventListener('keydown', event => {
            if (!(event.ctrlKey || event.metaKey) || event.isComposing) return;
            if (event.key.toLowerCase() === 's') { event.preventDefault(); document.activeElement?.blur(); saveCurrentChapter(); }
            if (event.key.toLowerCase() === 'z' && !document.querySelector('.modal.active, .editor-modal.active, dialog[open]')) {
                event.preventDefault(); document.activeElement?.blur(); record(); history(event.shiftKey ? 'redo' : 'undo');
            }
        });
        const scrollBox = document.querySelector('.node-table-container');
        let scrollFrame = 0;
        scrollBox.addEventListener('scroll', () => {
            if (scrollFrame || virtualStart < 0) return;
            scrollFrame = requestAnimationFrame(() => {
                scrollFrame = 0;
                const start = Math.max(0, Math.floor(Math.max(0, scrollBox.scrollTop - 55) / virtualRowHeight) - 10);
                if (Math.abs(start - virtualStart) < 5) return;
                const focused = document.activeElement;
                const cell = focused?.classList.contains('sheet-cell') ? {row:focused.dataset.row, col:focused.dataset.col, start:focused.selectionStart, end:focused.selectionEnd} : null;
                // Commit an in-progress edit before recycling offscreen row controls.
                if (cell) { record(); focused.blur(); }
                renderNodeTable();
                if (cell) {
                    const next = document.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
                    if (next) { next.focus({preventScroll:true}); if (cell.start !== null && next.setSelectionRange) next.setSelectionRange(cell.start, cell.end); }
                }
            });
        });
        setupAssets();
        renderTabs(); renderNodeTable();
    }
    function renderTabs() { document.querySelectorAll('[data-group]').forEach(btn => { const on = btn.dataset.group === group; btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', String(on)); }); }
    setup();
})();

