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
    const pageSize = 100;
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
        past = []; future = []; selected.clear(); active = 0; page = 0;
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
    autoSaveChapter = function() { originalSave(); record(); renderPreview(); updateStatus(); };
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
        originalSave(); renderNodeTable();
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
        const input = document.querySelector(`[data-row="${index}"][data-col="${col}"]`);
        if (input) { input.focus(); input.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
    }
    function activate(index) {
        active = index;
        document.querySelectorAll('.sheet-row').forEach(row => row.classList.toggle('is-current', Number(row.dataset.index) === active));
        renderPreview();
    }
    function makeCell(node, index, f, col) {
        const td = element('td');
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
                set(node, f.key, value); input.setCustomValidity('');
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
        td.append(input); if (f.key === 'dialogue') td.className = 'dialogue-cell';
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
        page = Math.max(0, Math.min(page, Math.ceil(visible.length / pageSize) - 1));
        for (const index of visible.slice(page * pageSize, (page + 1) * pageSize)) {
            const node = chapter.nodes[index], row = element('tr', undefined, 'sheet-row'); row.dataset.index = index;
            row.classList.toggle('is-current', active === index); row.classList.toggle('is-selected', selected.has(index));
            const selectTd = element('td'), check = element('input'); check.type = 'checkbox'; check.checked = selected.has(index);
            check.setAttribute('aria-label', `Select line ${index + 1}`);
            check.onchange = () => { check.checked ? selected.add(index) : selected.delete(index); renderNodeTable(); };
            selectTd.append(check);
            const indexTd = element('td'); indexTd.append(button(String(index + 1).padStart(2, '0'), () => activate(index), `Preview line ${index + 1} · Unity index ${index}`));
            row.append(selectTd, indexTd);
            groups[group].forEach((f, col) => row.append(makeCell(node, index, f, col)));
            const details = element('td', undefined, 'sheet-details');
            details.append(button('Edit details ↗', () => selectNode(index), 'All original node settings: choices, events, images, colors and characters'));
            const tags = [];
            if (node.hasChoices) tags.push(`${node.choiceList?.choices?.length || 0} choices`);
            if (node.commands?.length) tags.push(`${node.commands.length} commands`);
            if (node.cgAction !== 'None' && node.cgAction) tags.push(`CG ${node.cgAction}`);
            details.append(element('small', tags.join(' · ')));
            row.append(details); body.append(row);
        }
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
    function renderPreview() {
        const pane = $('sheetPreview'); if (!pane) return;
        pane.replaceChildren();
        active = Math.max(0, Math.min(active, chapter.nodes.length - 1));
        const node = chapter.nodes[active];
        const top = element('div', undefined, 'preview-top'); top.append(element('span', 'READING PREVIEW'), element('span', node ? `${active + 1} / ${chapter.nodes.length}` : '—')); pane.append(top);
        if (!node) { pane.append(element('p', 'Your dialogue preview appears here as you write.', 'preview-hint')); return; }
        let bg = '', cg = ''; const states = {};
        for (let i = 0; i <= active; i++) {
            const n = chapter.nodes[i]; if (n.backgroundSprite) bg = n.backgroundSprite;
            if (n.cgAction === 'Show') cg = n.cgSprite; if (n.cgAction === 'Hide') cg = '';
            for (const pos of ['left', 'center', 'right']) {
                const s = n[`${pos}Character`];
                if (s?.action === 'Exit') delete states[pos];
                else if (s?.action === 'Enter' || s?.action === 'ChangeOutfitExpression') states[pos] = { ...states[pos], ...s };
            }
        }
        const stage = element('div', undefined, 'preview-stage');
        const cached = cg ? getCGFromCache(cg) : bg ? getBackgroundFromCache(bg) : null;
        if (cached) { const img = element('img'); img.src = cached; img.alt = cg || bg; stage.append(img); }
        stage.append(element('span', cg ? `CG · ${cg}` : bg ? `BG · ${bg}${cached ? '' : ' · image not cached'}` : 'No background', 'stage-label'));
        const cast = element('div', undefined, 'preview-cast');
        for (const pos of ['left', 'center', 'right']) {
            const s = states[pos], slot = element('div', undefined, 'cast-slot');
            slot.append(element('small', pos));
            if (s) { slot.append(element('strong', getCharacterNameById(s.characterId) || s.characterId || 'Character'), element('small', [s.outfitID, s.poseID, s.expressionIndex].filter(x => x !== '').join(' / '))); }
            else slot.append(element('span', '—'));
            cast.append(slot);
        }
        stage.append(cast); pane.append(stage);
        const dialogue = element('div', undefined, 'preview-dialogue');
        const name = element('h3', node.isNarration ? 'Narrator' : getCharacterNameById(node.speakingCharacterId) || node.speakingCharacterId || 'Unnamed speaker');
        const content = element('p', node.dialogue || 'Start writing this line…');
        const cssColor = c => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a ?? 1})`;
        if (node.useSpecificNameColor && node.specificNameColor) name.style.color = cssColor(node.specificNameColor);
        if (node.useSpecificDialogueColor && node.specificDialogueColor) content.style.color = cssColor(node.specificDialogueColor);
        dialogue.append(name, content); pane.append(dialogue);
        const dialogueImage = node.dialogueImageSprite && getDialogueImageFromCache(node.dialogueImageSprite);
        if (dialogueImage) { const img = element('img'); img.src = dialogueImage; img.alt = node.dialogueImageSprite; img.className = 'preview-inline-image'; pane.append(img); }
        if (node.hasChoices) {
            const choices = element('div', undefined, 'preview-choices');
            for (const choice of node.choiceList?.choices || []) {
                const item = button(`${choice.choiceText || '(empty choice)'} → ${choice.nextChapterName || 'Continue'}`, () => {
                    if (choice.nextChapterName) tell(`Branch target: ${choice.nextChapterName}. Open that chapter in Browse Chapters to preview it. Commands are not executed.`);
                    else { active = Math.min(active + 1, chapter.nodes.length - 1); activate(active); }
                }); item.disabled = choice.isEnabled === false; choices.append(item);
            }
            pane.append(choices);
        }
        const nav = element('div', undefined, 'preview-nav');
        const prev = button('← Previous', () => activate(active - 1)), next = button('Next →', () => activate(active + 1));
        prev.disabled = active <= 0; next.disabled = active >= chapter.nodes.length - 1;
        nav.append(prev, button('Edit details', () => selectNode(active)), next); pane.append(nav);
        const notes = [`Camera: ${node.cameraRange || 'Far'} · Delay: ${node.dialogueDelay || 0}s`, ...(node.commands || []).map(c => `Command: ${c}`)];
        if (node.showSoundOptions) notes.push(`BGM: ${node.bgmAction} ${node.backgroundMusic || ''}`, `Ambient: ${node.ambientAction} ${node.ambientSound || ''}`, `SFX: ${node.soundEffect || '—'} · Voice: ${node.characterVoice || '—'}`);
        pane.append(element('p', notes.join('\n'), 'preview-meta'), element('p', 'Reading & staging guide. Character slots show asset names; Unity animations, rich-text markup, audio and commands are not played.', 'preview-hint'));
    }
    function setup() {
        document.body.classList.add('sheet-workspace');
        document.querySelector('.header h1').innerHTML = '<span class="brand-mark">VN</span> Story studio <small>VISUAL NOVEL EDITOR</small>';
        const content = document.querySelector('.content-area');
        const bar = element('section', undefined, 'sheet-toolbar');
        bar.innerHTML = `<div class="sheet-toolbar-top"><div><h2>Write the scene.</h2><p>Edit in place. Keep the story in view.</p></div><div class="sheet-actions"><button id="sheetUndo" title="Undo (Ctrl/Cmd + Z)">↶ Undo</button><button id="sheetRedo" title="Redo (Ctrl/Cmd + Shift + Z)">↷ Redo</button><button id="scriptPaste">Paste script</button><button id="csvExport">Export CSV</button><label class="sheet-file">Import CSV<input id="csvImport" type="file" accept=".csv,text/csv" hidden></label></div></div>
        <div class="sheet-controls"><div class="sheet-tabs" role="group" aria-label="Column groups"><button data-group="story">Story</button><button data-group="staging">Characters & visuals</button><button data-group="audio">Audio</button><button data-group="logic">Choices & commands</button></div><input id="sheetSearch" type="search" placeholder="Search dialogue, speaker, background…" aria-label="Search story"><select id="sheetFilter" aria-label="Filter lines"><option value="all">All lines</option><option value="choices">With choices</option><option value="narration">Narration</option><option value="empty">Empty dialogue</option></select><select id="sheetMode" aria-label="Editor view"><option value="sheet">Sheet view</option><option value="classic">Classic view</option></select><button id="previewToggle" aria-pressed="true">Preview</button></div>
        <div class="sheet-bulk"><span id="sheetCount"></span><button data-bulk="duplicate">Duplicate</button><button data-bulk="up">Move ↑</button><button data-bulk="down">Move ↓</button><button data-bulk="delete">Delete</button><details><summary>Find & replace</summary><div><input id="replaceFind" placeholder="Find exact text" aria-label="Find exact dialogue text"><input id="replaceWith" placeholder="Replace with" aria-label="Replacement text"><button id="replaceApply">Replace dialogue</button><small>Selected lines, or all search matches. Case-sensitive.</small></div></details></div>`;
        content.before(bar);
        const preview = element('aside'); preview.id = 'sheetPreview'; preview.setAttribute('aria-label', 'Live reading preview'); content.append(preview);
        const footer = element('footer', undefined, 'sheet-footer');
        footer.innerHTML = `<div><span id="sheetStatus"></span><span id="sheetNotice" role="status">Tab moves across cells · Enter moves down · Shift+Enter adds a new paragraph · Paste cells from a spreadsheet</span></div><div><button id="pageBack">←</button><span id="sheetPage"></span><button id="pageNext">→</button></div>`;
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
        $('sheetSearch').oninput = event => { query = event.target.value.toLowerCase(); page = 0; renderNodeTable(); };
        $('sheetFilter').onchange = event => { filter = event.target.value; page = 0; renderNodeTable(); };
        $('sheetMode').onchange = event => { mode = event.target.value; document.body.classList.toggle('classic-mode', mode === 'classic'); renderNodeTable(); };
        $('previewToggle').onclick = () => { const hidden = content.classList.toggle('preview-hidden'); $('previewToggle').setAttribute('aria-pressed', String(!hidden)); };
        document.querySelectorAll('[data-group]').forEach(btn => { btn.onclick = () => { group = btn.dataset.group; renderTabs(); renderNodeTable(); }; });
        document.querySelectorAll('[data-bulk]').forEach(btn => { btn.onclick = () => bulk(btn.dataset.bulk); });
        $('replaceApply').onclick = replaceText;
        $('pageBack').onclick = () => { page--; renderNodeTable(); }; $('pageNext').onclick = () => { page++; renderNodeTable(); };
        document.addEventListener('keydown', event => {
            if (!(event.ctrlKey || event.metaKey) || event.isComposing) return;
            if (event.key.toLowerCase() === 's') { event.preventDefault(); document.activeElement?.blur(); saveCurrentChapter(); }
            if (event.key.toLowerCase() === 'z' && !document.querySelector('.modal.active, .editor-modal.active, dialog[open]')) {
                event.preventDefault(); document.activeElement?.blur(); record(); history(event.shiftKey ? 'redo' : 'undo');
            }
        });
        renderTabs(); renderNodeTable();
    }
    function renderTabs() { document.querySelectorAll('[data-group]').forEach(btn => { const on = btn.dataset.group === group; btn.classList.toggle('active', on); btn.setAttribute('aria-pressed', String(on)); }); }
    setup();
})();
