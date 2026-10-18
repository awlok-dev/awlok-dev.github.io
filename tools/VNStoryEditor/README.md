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

The chapter model, JSON envelope, and character-library tools remain compatible. Image upload/cache plumbing now uses session-local File references; new image bytes are never written to localStorage. The legacy `metadata.backgroundImages` key remains present (empty for newly exported local assets). Older embedded-image JSON can still be imported for the current session. JSON still uses `{ chapter, metadata: { version: "1.0", exportDate, backgroundImages } }`. CSV is an additional editing format, not a replacement for the full Unity JSON export.

**Export CSV** exports the current column group for all matching lines. Headers are the model's exact property names (including nested paths such as `leftCharacter.action`), plus `nodeIndex`. The UI displays line numbers starting at 1; `nodeIndex` is the original zero-based array index.

**Import CSV** accepts any subset of the exported editable headers:

- Existing `nodeIndex` values update only the included fields; omitted fields, choices, events, commands and custom data remain intact.
- A blank or omitted `nodeIndex` appends a default node.
- Exported row indexes identify positions in the **current chapter**. Import into the same chapter before reordering/deleting rows; indexes are not permanent node IDs.
- Duplicate/out-of-range indexes, unknown/duplicate headers, malformed quotes, invalid enums, invalid booleans, negative delays and inconsistent row widths reject the entire import.
- UTF-8 BOM, Unicode, commas, escaped quotes and quoted multiline cells are supported. Commands use one command per line inside a quoted cell.
- Full round-tripping of chapter metadata and nested choice/event data uses JSON.

## Preview

Focus any cell or click a line number to inspect it. The preview carries background/CG and character-slot state forward through previous lines, uses linked local background/CG/dialogue images and character expression images, and shows dialogue, choices, camera, delays, commands and sound references. It is a reading/staging guide, not a Unity runtime emulator: character slots show linked sprites plus names/IDs, rich-text markup stays literal, and audio/commands/animations are not executed. Choice targets are displayed; use Browse Chapters to load a target chapter.

The Rows menu offers 50, 100, 250, or All matching rows. All is a continuous scroll view; for more than 250 lines, offscreen row controls are recycled to keep editing responsive. Every matching line is accessible and editable, including the last line. Textareas have a fixed height in continuous large-table mode. Sticky line numbers/header and horizontal scrolling keep wide staging sheets usable. On narrow screens the preview moves below the sheet.

## Browser regression test

From this folder:

```sh
npm install --prefix tests
npx --prefix tests playwright install chromium
python -m http.server 8765
```

In another terminal:

```sh
npm test --prefix tests
```

Optional environment variables: `VN_EDITOR_URL` (default `http://localhost:8765/vn_editor.html`), `CHROMIUM_EXECUTABLE` (custom Chromium binary), `VN_SCREENSHOT_DIR` (save desktop/mobile screenshots).



## Local images and complete debugging

Use **Local Images → Link folder** to reconnect your image folder for the current session. Auto mode recognizes Background, CG, and DialogueImage folder names. You can also explicitly choose the image category or link/drop individual image files. Existing node background/CG/dialogue-image upload controls now use the same local file store.

- No folder is uploaded. No image data is stored in localStorage or IndexedDB, and File/blob URLs never enter chapter JSON. Refreshing requires reconnecting the folder.
- Linking retains File references and indexes names/paths without decoding every image. Only displayed previews get object URLs. URLs are reused, trimmed to 24 unreferenced/active entries where possible, and revoked when replaced, unlinked, or leaving the page. Stage image elements are reused while typing; preview work is coalesced per animation frame.
- Character images resolve via the character library's selected expression filename and `CharacterName/OutfitID_Name/PoseID_Name/filename.png`. ID/name matching is case-insensitive. Multiple characters may use the same expression filename when their folders identify them. Ambiguous matches show no image rather than the wrong character.
- A directly selected background/CG/dialogue image takes precedence over a folder match with the same name.
- **Remove old stored image caches** frees storage left by the previous version, with confirmation. It retains story chapters and character definitions. Existing caches are not read or automatically deleted.
- Reading Preview includes resolved/inherited scene values, every stored node property (including disabled/empty options, nested choices/events and custom fields), and exact node JSON. Its panel scrolls independently, including on mobile.

## Drag rows and fill cells

Drag the **⠿ handle** in the line-number column to insert a line above or below the highlighted destination. Dragging a selected line moves all selected lines together in original order, preserving complete node data. Clear search/filters before dragging rows; bulk Move buttons remain available. Use All to drag within a continuous chapter.

Focus or hover a cell and drag its **small green corner handle** upward/downward to repeat that value in the same column. The gesture can auto-scroll and works across recycled rows in All view. Filled arrays (commands) are copied independently. Filtered filling affects only the visible matching sequence. Escape/pointer cancellation leaves the data untouched. A completed fill or row move is one undo step.
