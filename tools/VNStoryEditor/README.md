# Visual Novel Story Editor — sheet workspace

Open `vn_editor.html` directly or serve this folder with a static web server. No build step or runtime dependencies are required.

## Writing workflow

- **Sheet view** is the default. Edit dialogue and speaker IDs in place. Character IDs have suggestions from the existing character library.
- **Tab / Shift+Tab** moves between controls. **Enter** moves down in the same column and appends a new line at the end of an unfiltered chapter. **Shift+Enter** inserts a paragraph in dialogue/commands. IME composition is respected.
- Switch between **Story**, **Characters & visuals**, **Audio**, and **Choices & commands** column groups.
- Paste a rectangle from Excel/Sheets into a cell. It starts at that cell and follows the current column order. Multi-cell paste is validated before any changes apply. Filtered pastes update the matching rows; clear filters to append beyond them.
- **Paste script** appends speaker/dialogue TSV columns, or one narration node per non-empty plain-text line. Quoted TSV supports multiline dialogue.
- Check rows to duplicate, move up/down or delete together. The header checkbox selects all matching lines, including other pages. Find & replace changes dialogue in the selection, or all matching lines when nothing is selected; matching is literal and case-sensitive.
- **Undo / Redo** retains up to 60 chapter changes for this session, including advanced-editor changes. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z work outside dialogs. Changing chapters clears history. Character-library and image-cache changes are not chapter undo operations.
- **Save Chapter / Ctrl+S / Cmd+S** saves to browser storage. Edits are marked unsaved until saved, as in the original editor. Export JSON for a portable chapter backup.
- **Edit details** opens every original node control: choices, events, colors, character settings, image uploads, etc. **Classic view** retains the original table and drag-and-drop reordering.

## CSV and Unity compatibility

The original `vn_editor.js`, JSON import/export functions, chapter model, image caches and character-library tools remain unchanged. JSON still uses `{ chapter, metadata: { version: "1.0", exportDate, backgroundImages } }`. CSV is an additional editing format, not a replacement for the full Unity JSON export.

**Export CSV** exports the current column group for all matching lines. Headers are the model's exact property names (including nested paths such as `leftCharacter.action`), plus `nodeIndex`. The UI displays line numbers starting at 1; `nodeIndex` is the original zero-based array index.

**Import CSV** accepts any subset of the exported editable headers:

- Existing `nodeIndex` values update only the included fields; omitted fields, choices, events, commands and custom data remain intact.
- A blank or omitted `nodeIndex` appends a default node.
- Exported row indexes identify positions in the **current chapter**. Import into the same chapter before reordering/deleting rows; indexes are not permanent node IDs.
- Duplicate/out-of-range indexes, unknown/duplicate headers, malformed quotes, invalid enums, invalid booleans, negative delays and inconsistent row widths reject the entire import.
- UTF-8 BOM, Unicode, commas, escaped quotes and quoted multiline cells are supported. Commands use one command per line inside a quoted cell.
- Full round-tripping of chapter metadata and nested choice/event data uses JSON.

## Preview

Focus any cell or click a line number to inspect it. The preview carries background/CG and character-slot state forward through previous lines, uses cached background/CG/dialogue images, and shows dialogue, choices, camera, delays, commands and sound references. It is a reading/staging guide, not a Unity runtime emulator: character slots show names/IDs, rich-text markup stays literal, and audio/commands/animations are not executed. Choice targets are displayed; use Browse Chapters to load a target chapter.

The sheet renders 100 matching rows per page. Sticky line numbers/header and horizontal scrolling keep wide staging sheets usable. On narrow screens the preview moves below the sheet.

## Browser regression test

From this folder:

```sh
npm install --prefix tests
npx --prefix tests playwright install chromium
python -m http.server 8765
```

In another terminal:

```sh
node tests/editor.cjs
```

Optional environment variables: `VN_EDITOR_URL` (default `http://localhost:8765/vn_editor.html`), `CHROMIUM_EXECUTABLE` (custom Chromium binary), `VN_SCREENSHOT_DIR` (save desktop/mobile screenshots).
