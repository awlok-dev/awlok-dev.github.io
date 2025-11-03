/**
 * Visual Novel Story Editor - Main JavaScript
 * 
 * This file contains all the logic for the VN Story Editor web application.
 * Manages dialogue nodes, character states, choices, and chapter data.
 * 
 * Main HTML file: vn_editor.html
 * Stylesheet: vn_editor_style.css
 */

        // Unity SO_StoryChapter structure
        let chapter = {
            storyName: "StoryName",      // Story folder name in Unity
            chapterName: "Chapter",      // Chapter display name
            fileName: "SO_StoryName_Chapter",      // JSON file / SO asset name
            nextChapter: "",             // Next chapter to follow after this one
            nodes: []
        };
        
        let currentNodeIndex = null;
        let editingChoiceIndex = null;
        let currentChapterId = null; // Track which chapter we're editing
        let hasUnsavedChanges = false; // Track if current chapter has unsaved changes
        const STORAGE_KEY = 'vn_chapters';

        // Character action types from Unity
        const CharacterActions = ["None", "Enter", "Exit", "ChangeOutfitExpression"];
        const CameraRanges = ["Far", "Middle", "Close", "Stay"];
        const SoundActions = ["None", "Play", "Stop"];
        const ExpressionSymbols = ["None", "Heart", "Anger", "Sweat", "Question", "Exclamation", "Music", "Sleep"];
        const CGActions = ["None", "Show", "Hide"];

        // Background image cache for performance optimization
        const BACKGROUND_ROOT_PATH = 'Textures/Background/';
        const BACKGROUND_CACHE_KEY = 'vn_background_cache';
        
        // CG image cache for performance optimization
        const CG_ROOT_PATH = 'Textures/CG/';
        const CG_CACHE_KEY = 'vn_cg_cache';

        // Character Library Management
        const CHARACTER_LIBRARY_KEY = 'vn_character_library';
        let characterLibrary = {}; // { characterId: characterData }
        let currentEditingCharacter = null;
        let currentEditingCharacterId = null;
        let currentPickerTarget = null; // { position: 'left'|'center'|'right', nodeIndex: number }

        // Initialize empty node structure matching DialogueNode
        function createEmptyNode() {
            return {
                leftCharacter: createEmptyCharacterState(),
                centerCharacter: createEmptyCharacterState(),
                rightCharacter: createEmptyCharacterState(),
                speakingCharacterId: "",
                dialogue: "",
                backgroundSprite: "",
                isNarration: false,
                cameraRange: "Far",
                hasChoices: false,
                choiceList: { choices: [] },
                choicesDelay: 0.5,
                showGameEvents: false,
                gameEventList: { onLineEnterEvent: [] },
                commands: [], // Commands to execute when this line is displayed
                showSoundOptions: false,
                bgmAction: "None",
                backgroundMusic: "",
                ambientAction: "None",
                ambientSound: "",
                soundEffect: "",
                characterVoice: "",
                useSpecificNameColor: false,
                specificNameColor: { r: 0, g: 0, b: 0, a: 1 },
                useSpecificDialogueColor: false,
                specificDialogueColor: { r: 0, g: 0, b: 0, a: 1 },
                cgAction: "None",
                cgSprite: "",
                dialogueDelay: 0.0
            };
        }

        function createEmptyCharacterState() {
            return {
                action: "None",
                characterId: "",
                outfitID: "",
                poseID: "",
                expressionIndex: "",
                symbolType: "None"
            };
        }

        function addNode() {
            const node = createEmptyNode();
            chapter.nodes.push(node);
            renderNodeTable();
            selectNode(chapter.nodes.length - 1);
            autoSaveChapter();
        }

        function deleteNode(index, event) {
            event.stopPropagation();
            if (!confirm('Are you sure you want to delete this node?')) return;

            chapter.nodes.splice(index, 1);
            if (currentNodeIndex === index) {
                currentNodeIndex = null;
                closeEditor();
            } else if (currentNodeIndex > index) {
                currentNodeIndex--;
            }
            renderNodeTable();
            autoSaveChapter();
        }

        function selectNode(index) {
            currentNodeIndex = index;
            renderNodeTable();
            openEditor();
        }

        let originalStoryName = '';
        let originalChapterName = '';
        let originalFileName = '';

        function toggleEditNames() {
            const storyInput = document.getElementById('storyName');
            const chapterInput = document.getElementById('chapterName');
            const fileInput = document.getElementById('fileName');
            const nextChapterInput = document.getElementById('nextChapter');
            const btn = document.getElementById('editNameBtn');
            
            if (storyInput.readOnly) {
                // Enable editing
                originalStoryName = storyInput.value;
                originalChapterName = chapterInput.value;
                originalFileName = fileInput.value;
                storyInput.readOnly = false;
                chapterInput.readOnly = false;
                fileInput.readOnly = false;
                nextChapterInput.readOnly = false;
                storyInput.focus();
                storyInput.select();
                btn.textContent = 'Save';
                btn.className = 'save-name-btn';
            } else {
                // Save and disable editing
                storyInput.readOnly = true;
                chapterInput.readOnly = true;
                fileInput.readOnly = true;
                nextChapterInput.readOnly = true;
                btn.textContent = 'Edit';
                btn.className = 'edit-name-btn';
                
                // Validate inputs
                if (storyInput.value.trim() === '') {
                    storyInput.value = originalStoryName;
                    alert('Story name cannot be empty!');
                    return;
                }
                if (chapterInput.value.trim() === '') {
                    chapterInput.value = originalChapterName;
                    alert('Chapter name cannot be empty!');
                    return;
                }
                if (fileInput.value.trim() === '') {
                    fileInput.value = originalFileName;
                    alert('File name cannot be empty!');
                    return;
                }
                
                // Update chapter data
                chapter.storyName = storyInput.value.trim();
                chapter.chapterName = chapterInput.value.trim();
                chapter.fileName = fileInput.value.trim();
                chapter.nextChapter = nextChapterInput.value.trim();
                autoSaveChapter();
            }
        }

        // Add keyboard support for name editing
        document.addEventListener('DOMContentLoaded', function() {
            const storyNameInput = document.getElementById('storyName');
            const chapterNameInput = document.getElementById('chapterName');
            const fileNameInput = document.getElementById('fileName');
            const nextChapterInput = document.getElementById('nextChapter');
            
            function handleKeydown(e) {
                if (!this.readOnly) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        toggleEditNames();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        storyNameInput.value = originalStoryName;
                        chapterNameInput.value = originalChapterName;
                        fileNameInput.value = originalFileName;
                        nextChapterInput.value = chapter.nextChapter || '';
                        toggleEditNames();
                    }
                }
            }
            
            storyNameInput.addEventListener('keydown', handleKeydown);
            chapterNameInput.addEventListener('keydown', handleKeydown);
            fileNameInput.addEventListener('keydown', handleKeydown);
            nextChapterInput.addEventListener('keydown', handleKeydown);
        });

        function clearAllNodes() {
            if (chapter.nodes.length === 0) {
                alert('No nodes to clear!');
                return;
            }

            if (!confirm(`Are you sure you want to delete all ${chapter.nodes.length} node(s)? This cannot be undone!`)) {
                return;
            }

            chapter.nodes = [];
            currentNodeIndex = null;
            closeEditor();
            renderNodeTable();
            autoSaveChapter();
            alert('All nodes cleared!');
        }

        function getActiveCharacters(node) {
            const chars = [];
            if (node.leftCharacter?.action !== 'None' && node.leftCharacter?.characterId) {
                chars.push({ pos: 'L', id: node.leftCharacter.characterId });
            }
            if (node.centerCharacter?.action !== 'None' && node.centerCharacter?.characterId) {
                chars.push({ pos: 'C', id: node.centerCharacter.characterId });
            }
            if (node.rightCharacter?.action !== 'None' && node.rightCharacter?.characterId) {
                chars.push({ pos: 'R', id: node.rightCharacter.characterId });
            }
            return chars;
        }

        function renderNodeTable() {
            const tbody = document.getElementById('nodeTableBody');
            tbody.innerHTML = '';

            if (chapter.nodes.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-state">
                            <h3>No Nodes Yet</h3>
                            <p>Click "Add Node" to create your first dialogue node.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            chapter.nodes.forEach((node, index) => {
                const tr = document.createElement('tr');
                tr.draggable = true;
                tr.dataset.index = index;
                if (index === currentNodeIndex) {
                    tr.classList.add('active');
                }

                // Drag handle
                const dragTd = document.createElement('td');
                dragTd.innerHTML = '<span class="drag-handle">☰</span>';
                dragTd.onclick = (e) => e.stopPropagation();
                tr.appendChild(dragTd);

                // Index
                const indexTd = document.createElement('td');
                indexTd.className = 'node-index';
                indexTd.textContent = index;
                tr.appendChild(indexTd);

                // Dialogue preview
                const dialogueTd = document.createElement('td');
                dialogueTd.className = 'dialogue-preview';
                dialogueTd.textContent = node.dialogue || '(empty dialogue)';
                dialogueTd.title = node.dialogue || '';
                tr.appendChild(dialogueTd);

                // Speaking character
                const speakingTd = document.createElement('td');
                if (node.isNarration) {
                    speakingTd.innerHTML = '<span class="tag narration">Narration</span>';
                } else if (node.speakingCharacterId) {
                    const charName = getCharacterNameById(node.speakingCharacterId);
                    const displayText = charName ? `${node.speakingCharacterId} (${charName})` : node.speakingCharacterId;
                    speakingTd.innerHTML = `<span class="character-badge">${displayText}</span>`;
                } else {
                    speakingTd.innerHTML = '<span class="tag">None</span>';
                }
                tr.appendChild(speakingTd);

                // Camera range
                const cameraTd = document.createElement('td');
                cameraTd.innerHTML = `<span class="tag">${node.cameraRange}</span>`;
                tr.appendChild(cameraTd);

                // Active characters
                const charsTd = document.createElement('td');
                const activeChars = getActiveCharacters(node);
                if (activeChars.length > 0) {
                    charsTd.innerHTML = activeChars.map(c => {
                        const charName = getCharacterNameById(c.id);
                        const displayText = charName ? `${c.id} (${charName})` : c.id;
                        return `<span class="character-badge">${c.pos}: ${displayText}</span>`;
                    }).join('');
                } else {
                    charsTd.innerHTML = '<span class="tag">None</span>';
                }
                tr.appendChild(charsTd);

                // Info tags
                const infoTd = document.createElement('td');
                const tags = [];
                if (node.hasChoices && node.choiceList.choices.length > 0) {
                    tags.push(`<span class="tag has-choices">${node.choiceList.choices.length} choice(s)</span>`);
                }
                if (node.backgroundSprite) {
                    tags.push('<span class="tag">BG</span>');
                }
                if (node.cgAction && node.cgAction !== 'None') {
                    tags.push(`<span class="tag">🎨 ${node.cgAction}</span>`);
                }
                if (node.showSoundOptions && (node.backgroundMusic || node.soundEffect || node.characterVoice)) {
                    tags.push('<span class="tag">🔊</span>');
                }
                if (node.commands && node.commands.length > 0) {
                    tags.push(`<span class="tag">⚡ ${node.commands.length} command(s)</span>`);
                }
                if (node.dialogueDelay && node.dialogueDelay > 0) {
                    tags.push(`<span class="tag">⏱️ ${node.dialogueDelay}s</span>`);
                }
                infoTd.innerHTML = tags.join('');
                tr.appendChild(infoTd);

                // Actions
                const actionsTd = document.createElement('td');
                actionsTd.className = 'actions';
                actionsTd.innerHTML = `
                    <button onclick="duplicateNode(${index}, event)" title="Duplicate">📋</button>
                    <button class="delete-btn" onclick="deleteNode(${index}, event)" title="Delete">🗑️</button>
                `;
                actionsTd.onclick = (e) => e.stopPropagation();
                tr.appendChild(actionsTd);

                // Click row to edit
                tr.onclick = () => selectNode(index);

                // Drag and drop events
                tr.addEventListener('dragstart', handleDragStart);
                tr.addEventListener('dragover', handleDragOver);
                tr.addEventListener('drop', handleDrop);
                tr.addEventListener('dragend', handleDragEnd);

                tbody.appendChild(tr);
            });
        }

        function duplicateNode(index, event) {
            event.stopPropagation();
            const original = chapter.nodes[index];
            const duplicate = JSON.parse(JSON.stringify(original));
            chapter.nodes.splice(index + 1, 0, duplicate);
            renderNodeTable();
            autoSaveChapter();
        }

        // Drag and drop functionality
        let draggedElement = null;
        let draggedIndex = null;

        function handleDragStart(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            
            // Add visual feedback
            const rows = document.querySelectorAll('.node-table tbody tr');
            rows.forEach(r => r.classList.remove('drag-over'));
            if (this !== draggedElement) {
                this.classList.add('drag-over');
            }
            
            return false;
        }

        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            // Remove visual feedback
            const rows = document.querySelectorAll('.node-table tbody tr');
            rows.forEach(r => r.classList.remove('drag-over'));

            if (draggedElement !== this) {
                const targetIndex = parseInt(this.dataset.index);
                
                // Reorder the nodes array
                const draggedNode = chapter.nodes[draggedIndex];
                chapter.nodes.splice(draggedIndex, 1);
                chapter.nodes.splice(targetIndex, 0, draggedNode);

                // Update current node index if needed
                if (currentNodeIndex === draggedIndex) {
                    currentNodeIndex = targetIndex;
                } else if (draggedIndex < currentNodeIndex && targetIndex >= currentNodeIndex) {
                    currentNodeIndex--;
                } else if (draggedIndex > currentNodeIndex && targetIndex <= currentNodeIndex) {
                    currentNodeIndex++;
                }

                renderNodeTable();
                autoSaveChapter();
            }
            return false;
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            // Remove all drag-over classes
            const rows = document.querySelectorAll('.node-table tbody tr');
            rows.forEach(r => r.classList.remove('drag-over'));
        }

        function openEditor() {
            document.getElementById('editorModal').classList.add('active');
            document.getElementById('editorModalTitle').textContent = `Edit Node ${currentNodeIndex}`;
            renderEditor();
        }

        function closeEditor() {
            document.getElementById('editorModal').classList.remove('active');
            currentNodeIndex = null;
            renderNodeTable();
        }

        function renderEditor() {
            const editorArea = document.getElementById('editorArea');
            
            if (currentNodeIndex === null) {
                editorArea.innerHTML = '';
                return;
            }

            const node = chapter.nodes[currentNodeIndex];
            if (!node) return;

            editorArea.innerHTML = `
                <!-- Character Positions -->
                <div class="section-header">Character Positions</div>
                <div class="character-positions">
                    ${renderCharacterSlot('left', 'Left Character', node.leftCharacter)}
                    ${renderCharacterSlot('center', 'Center Character', node.centerCharacter)}
                    ${renderCharacterSlot('right', 'Right Character', node.rightCharacter)}
                </div>

                <!-- Dialogue Content -->
                <div class="section-header">Dialogue Content</div>
                
                <div class="form-group">
                    <label>Speaking Character ID</label>
                    <input type="text" id="speakingCharacterId" value="${node.speakingCharacterId || ''}" 
                           onchange="updateNodeField('speakingCharacterId', this.value)" 
                           placeholder="Leave empty for narrator">
                </div>

                <div class="checkbox-field">
                    <input type="checkbox" id="isNarration" ${node.isNarration ? 'checked' : ''} 
                           onchange="updateNodeField('isNarration', this.checked)">
                    <label>Is Narration</label>
                </div>

                <div class="form-group">
                    <label>Dialogue Text</label>
                    <textarea id="dialogue" onchange="updateNodeField('dialogue', this.value)" 
                              placeholder="Enter dialogue text...">${node.dialogue || ''}</textarea>
                </div>

                <div class="form-group">
                    <label>Background Sprite</label>
                    <div class="background-sprite-container">
                        <div>
                            <div class="background-dropzone" id="bgDropzone" onclick="document.getElementById('bgFileInput').click()">
                                <input type="file" id="bgFileInput" accept="image/*" onchange="handleBackgroundFile(event)">
                                <div class="dropzone-content">
                                    <div class="icon">🖼️</div>
                                    <div class="text">Drop image here or click to browse</div>
                                    <div class="hint">Supports: PNG, JPG, JPEG, WebP</div>
                                </div>
                            </div>
                            <div class="background-path-display" id="bgPathDisplay">
                                ${node.backgroundSprite ? 'Textures/Background/' + node.backgroundSprite : 'No background selected'}
                            </div>
                            <div class="background-actions">
                                <button class="manual-input-btn" onclick="manualBackgroundInput()">✏️️ Manual Input</button>
                                <button class="clear-bg-btn" onclick="clearBackground()">🗑️ Clear</button>
                            </div>
                        </div>
                        <div class="background-preview-container">
                            <div class="background-preview" id="bgPreview">
                                <img id="bgPreviewImg" alt="Background preview">
                                <div class="placeholder">Preview will appear here</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Camera Range</label>
                    <select id="cameraRange" onchange="updateNodeField('cameraRange', this.value)">
                        ${CameraRanges.map(r => `<option value="${r}" ${node.cameraRange === r ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>

                <!-- Choices Section -->
                <div class="section-header">Choices (Branching)</div>
                <div class="checkbox-field">
                    <input type="checkbox" id="hasChoices" ${node.hasChoices ? 'checked' : ''} 
                           onchange="updateNodeField('hasChoices', this.checked); renderEditor();">
                    <label>Has Choices</label>
                </div>

                <div id="choicesContainer" style="display: ${node.hasChoices ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>Choices Delay (seconds)</label>
                        <input type="number" id="choicesDelay" value="${node.choicesDelay || 0.5}" 
                               onchange="updateNodeField('choicesDelay', parseFloat(this.value))" 
                               step="0.1" min="0">
                    </div>
                    <div class="choice-list" id="choiceList"></div>
                    <button class="add-choice-btn" onclick="openChoiceModal()">+ Add Choice</button>
                </div>

                <!-- Commands Section -->
                <div class="section-header">Commands</div>
                <div class="form-group">
                    <label>Line Commands</label>
                    <div class="command-list" id="commandList"></div>
                    <button class="add-command-btn" onclick="addCommand()">+ Add Command</button>
                    <small style="color: #718096; font-size: 11px; margin-top: 5px; display: block;">
                        Commands will be executed when this dialogue line is displayed. Format: "commandname parameter1 parameter2"
                    </small>
                </div>

                <!-- Audio Section -->
                <div class="section-header">Audio Settings</div>
                <div class="checkbox-field">
                    <input type="checkbox" id="showSoundOptions" ${node.showSoundOptions ? 'checked' : ''} 
                           onchange="updateNodeField('showSoundOptions', this.checked); renderEditor();">
                    <label>Show Sound Options</label>
                </div>

                <div id="audioContainer" style="display: ${node.showSoundOptions ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>BGM Action</label>
                        <select id="bgmAction" onchange="updateNodeField('bgmAction', this.value); renderEditor();">
                            ${SoundActions.map(a => `<option value="${a}" ${node.bgmAction === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    ${node.bgmAction === 'Play' ? `
                        <div class="form-group">
                            <label>Background Music Path</label>
                            <input type="text" id="backgroundMusic" value="${node.backgroundMusic || ''}" 
                                   onchange="updateNodeField('backgroundMusic', this.value)" 
                                   placeholder="e.g., Audio/BGM/Theme01">
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Ambient Action</label>
                        <select id="ambientAction" onchange="updateNodeField('ambientAction', this.value); renderEditor();">
                            ${SoundActions.map(a => `<option value="${a}" ${node.ambientAction === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    ${node.ambientAction === 'Play' ? `
                        <div class="form-group">
                            <label>Ambient Sound Path</label>
                            <input type="text" id="ambientSound" value="${node.ambientSound || ''}" 
                                   onchange="updateNodeField('ambientSound', this.value)" 
                                   placeholder="e.g., Audio/SFX/Rain">
                        </div>
                    ` : ''}

                    <div class="form-group">
                        <label>Sound Effect Path</label>
                        <input type="text" id="soundEffect" value="${node.soundEffect || ''}" 
                               onchange="updateNodeField('soundEffect', this.value)" 
                               placeholder="e.g., Audio/SFX/DoorOpen">
                        </div>

                    <div class="form-group">
                        <label>Character Voice Path</label>
                        <input type="text" id="characterVoice" value="${node.characterVoice || ''}" 
                               onchange="updateNodeField('characterVoice', this.value)" 
                               placeholder="e.g., Audio/Voice/Char01_Line05">
                    </div>
                </div>

                <!-- CG Section -->
                <div class="section-header">CG (Computer Graphics)</div>
                <div class="form-group">
                    <label>CG Action</label>
                    <select id="cgAction" onchange="updateNodeField('cgAction', this.value); renderEditor();">
                        ${CGActions.map(a => `<option value="${a}" ${node.cgAction === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
                ${node.cgAction === 'Show' ? `
                    <div class="form-group">
                        <label>CG Sprite</label>
                        <div class="background-sprite-container">
                            <div>
                                <div class="background-dropzone" id="cgDropzone" onclick="document.getElementById('cgFileInput').click()">
                                    <input type="file" id="cgFileInput" accept="image/*" onchange="handleCGFile(event)">
                                    <div class="dropzone-content">
                                        <div class="icon">🎨</div>
                                        <div class="text">Drop CG image here or click to browse</div>
                                        <div class="hint">Supports: PNG, JPG, JPEG, WebP</div>
                                    </div>
                                </div>
                                <div class="background-path-display" id="cgPathDisplay">
                                    ${node.cgSprite ? 'Textures/CG/' + node.cgSprite : 'No CG selected'}
                                </div>
                                <div class="background-actions">
                                    <button class="manual-input-btn" onclick="manualCGInput()">✏️ Manual Input</button>
                                    <button class="clear-bg-btn" onclick="clearCG()">🗑️ Clear</button>
                                </div>
                            </div>
                            <div class="background-preview-container">
                                <div class="background-preview" id="cgPreview">
                                    <img id="cgPreviewImg" alt="CG preview">
                                    <div class="placeholder">CG preview will appear here</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}

                <!-- Optional Configuration -->
                <div class="section-header">Optional Configuration</div>
                <div class="form-group">
                    <label>Dialogue Delay (seconds)</label>
                    <input type="number" id="dialogueDelay" value="${node.dialogueDelay || 0}" 
                           onchange="updateNodeField('dialogueDelay', parseFloat(this.value))" 
                           step="0.1" min="0"
                           placeholder="Additional delay for dialogue display">
                    <small style="color: #718096; font-size: 11px;">Additional delay in seconds for dialogue display (useful for pacing)</small>
                </div>

                <div class="checkbox-field">
                    <input type="checkbox" id="useSpecificNameColor" ${node.useSpecificNameColor ? 'checked' : ''} 
                           onchange="updateNodeField('useSpecificNameColor', this.checked); renderEditor();">
                    <label>Use Specific Name Color</label>
                </div>
                ${node.useSpecificNameColor ? `
                    <div class="form-group">
                        <label>Specific Name Color</label>
                        <input type="color" id="specificNameColor" 
                               value="${rgbToHex(node.specificNameColor)}" 
                               onchange="updateNodeField('specificNameColor', hexToRgb(this.value))">
                    </div>
                ` : ''}

                <div class="checkbox-field">
                    <input type="checkbox" id="useSpecificDialogueColor" ${node.useSpecificDialogueColor ? 'checked' : ''} 
                           onchange="updateNodeField('useSpecificDialogueColor', this.checked); renderEditor();">
                    <label>Use Specific Dialogue Color</label>
                </div>
                ${node.useSpecificDialogueColor ? `
                    <div class="form-group">
                        <label>Specific Dialogue Color</label>
                        <input type="color" id="specificDialogueColor" 
                               value="${rgbToHex(node.specificDialogueColor)}" 
                               onchange="updateNodeField('specificDialogueColor', hexToRgb(this.value))">
                    </div>
                ` : ''}
            `;

            // Update character field listeners
            updateCharacterFieldListeners();
            
            // Render choices if they exist
            if (node.hasChoices) {
            renderChoices();
        }

            // Render commands
            renderCommands();

            // Setup background dropzone and load preview
            setTimeout(() => {
                setupBackgroundDropzone();
                loadBackgroundPreviewFromCache(node.backgroundSprite);
                
                // Setup CG dropzone and load preview
                setupCGDropzone();
                loadCGPreviewFromCache(node.cgSprite);
            }, 0);
        }

        function getCharacterNameById(characterId) {
            if (!characterId) return '';
            const character = characterLibrary[characterId];
            return character ? character.characterName : '';
        }

        function renderCharacterSlot(position, title, charState) {
            const characterName = getCharacterNameById(charState.characterId);
            return `
                <div class="character-slot">
                    <h4>${title}</h4>
                    <div class="character-field">
                        <label>Action</label>
                        <select data-position="${position}" data-field="action">
                            ${CharacterActions.map(a => `<option value="${a}" ${charState.action === a ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                        </div>
                    <div class="character-field">
                        <label>Character ID</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" data-position="${position}" data-field="characterId" 
                                   value="${charState.characterId || ''}" placeholder="e.g., 0, 1, 2" style="flex: 1;">
                            <button onclick="openCharacterPicker('${position}', currentNodeIndex)" 
                                    style="padding: 6px 10px; background: #5a67d8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;"
                                    title="Pick from character library">📚</button>
                        </div>
                    </div>
                    <div class="character-field">
                        <label>Character Name</label>
                        <input type="text" data-position="${position}" data-field="characterName" value="${characterName}" 
                               placeholder="Character name will appear here" readonly 
                               style="background: #252d3d; color: #a0aec0; cursor: not-allowed; border-color: #2d3748;">
                        <small style="color: #718096; font-size: 10px;">Auto-displayed from character library</small>
                    </div>
                    <div class="character-field">
                        <label>Outfit ID</label>
                        <input type="text" data-position="${position}" data-field="outfitID" 
                               value="${charState.outfitID || ''}" placeholder="Leave empty to use cached">
                    </div>
                    <div class="character-field">
                        <label>Pose ID</label>
                        <input type="text" data-position="${position}" data-field="poseID" 
                               value="${charState.poseID || ''}" placeholder="Leave empty to use cached">
                    </div>
                    <div class="character-field">
                        <label>Expression Index</label>
                        <input type="text" data-position="${position}" data-field="expressionIndex" 
                               value="${charState.expressionIndex || ''}" placeholder="e.g., 0, 1, 2">
                    </div>
                    <div class="character-field">
                        <label>Symbol Type</label>
                        <select data-position="${position}" data-field="symbolType">
                            ${ExpressionSymbols.map(s => `<option value="${s}" ${charState.symbolType === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    </div>
                `;
        }

        function updateCharacterFieldListeners() {
            document.querySelectorAll('[data-position]').forEach(elem => {
                elem.addEventListener('change', function() {
                    const position = this.dataset.position;
                    const field = this.dataset.field;
                    const value = this.value;
                    updateCharacterField(position, field, value);
                    
                    // If character ID changed, update the character name display
                    if (field === 'characterId') {
                        updateCharacterNameDisplay(position);
                    }
                });
            });
        }

        function updateCharacterNameDisplay(position) {
            const charState = chapter.nodes[currentNodeIndex][position + 'Character'];
            const characterName = getCharacterNameById(charState.characterId);
            
            // Find the character name input for this position
            const nameInput = document.querySelector(`[data-position="${position}"][data-field="characterName"]`);
            if (nameInput) {
                nameInput.value = characterName;
            }
        }

        function updateCharacterField(position, field, value) {
            const node = chapter.nodes[currentNodeIndex];
            if (!node) return;
            
            const charKey = position + 'Character';
            node[charKey][field] = value;
            updateTableAndModal();
        }

        function updateNodeField(field, value) {
            const node = chapter.nodes[currentNodeIndex];
            if (!node) return;
            
            node[field] = value;
            updateTableAndModal();
        }

        function updateTableAndModal() {
            const wasOpen = document.getElementById('editorModal').classList.contains('active');
            renderNodeTable();
            if (wasOpen && currentNodeIndex !== null) {
                document.getElementById('editorModalTitle').textContent = `Edit Node ${currentNodeIndex}`;
            }
            autoSaveChapter();
        }

        // ============ Background Sprite Management ============

        // Background cache management in localStorage
        function getBackgroundCache() {
            try {
                const cache = localStorage.getItem(BACKGROUND_CACHE_KEY);
                return cache ? JSON.parse(cache) : {};
            } catch (e) {
                console.error('Error reading background cache:', e);
                return {};
            }
        }

        function saveBackgroundToCache(fileName, dataUrl) {
            try {
                const cache = getBackgroundCache();
                cache[fileName] = {
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                };
                localStorage.setItem(BACKGROUND_CACHE_KEY, JSON.stringify(cache));
            } catch (e) {
                console.error('Error saving to background cache:', e);
                // If localStorage is full, try to clean old entries
                cleanOldBackgroundCache();
            }
        }

        function getBackgroundFromCache(fileName) {
            const cache = getBackgroundCache();
            return cache[fileName]?.dataUrl || null;
        }

        function cleanOldBackgroundCache() {
            try {
                const cache = getBackgroundCache();
                const entries = Object.entries(cache);
                
                // Sort by timestamp and keep only the 50 most recent
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const newCache = {};
                
                entries.slice(0, 50).forEach(([key, value]) => {
                    newCache[key] = value;
                });
                
                localStorage.setItem(BACKGROUND_CACHE_KEY, JSON.stringify(newCache));
            } catch (e) {
                console.error('Error cleaning background cache:', e);
            }
        }

        // CG Cache Functions
        function getCGCache() {
            try {
                const cache = localStorage.getItem(CG_CACHE_KEY);
                return cache ? JSON.parse(cache) : {};
            } catch (e) {
                console.error('Error reading CG cache:', e);
                return {};
            }
        }

        function saveCGToCache(fileName, dataUrl) {
            try {
                const cache = getCGCache();
                cache[fileName] = {
                    dataUrl: dataUrl,
                    timestamp: Date.now()
                };
                localStorage.setItem(CG_CACHE_KEY, JSON.stringify(cache));
            } catch (e) {
                console.error('Error saving to CG cache:', e);
                // If localStorage is full, try to clean old entries
                cleanOldCGCache();
            }
        }

        function getCGFromCache(fileName) {
            const cache = getCGCache();
            return cache[fileName]?.dataUrl || null;
        }

        function cleanOldCGCache() {
            try {
                const cache = getCGCache();
                const entries = Object.entries(cache);
                
                // Sort by timestamp and keep only the 50 most recent
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const newCache = {};
                
                entries.slice(0, 50).forEach(([key, value]) => {
                    newCache[key] = value;
                });
                
                localStorage.setItem(CG_CACHE_KEY, JSON.stringify(newCache));
            } catch (e) {
                console.error('Error cleaning CG cache:', e);
            }
        }

        function manageBgCache() {
            const cache = getBackgroundCache();
            const entries = Object.entries(cache);
            
            if (entries.length === 0) {
                alert('📁 Background Cache is empty!\n\nNo background images are currently cached.');
                return;
            }

            // Sort by timestamp (most recent first)
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);

            let message = `🖼️ BACKGROUND CACHE MANAGER\n\n`;
            message += `📁Š Total cached: ${entries.length} image(s)\n\n`;
            message += `Cached backgrounds:\n`;
            
            entries.slice(0, 10).forEach(([name, data], index) => {
                const date = new Date(data.timestamp);
                const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                message += `${index + 1}. ${name}\n   └─ ${dateStr}\n`;
            });
            
            if (entries.length > 10) {
                message += `... and ${entries.length - 10} more\n`;
            }

            message += `\n💡 Tip: These previews are saved in your browser\n`;
            message += `and will persist across sessions.\n\n`;
            message += `Would you like to CLEAR ALL background cache?`;

            if (confirm(message)) {
                localStorage.removeItem(BACKGROUND_CACHE_KEY);
                alert(`✅ Background cache cleared!\n\n${entries.length} image(s) removed from cache.`);
            }
        }

        function setupBackgroundDropzone() {
            const dropzone = document.getElementById('bgDropzone');
            if (!dropzone) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.remove('dragover');
                }, false);
            });

            dropzone.addEventListener('drop', handleBackgroundDrop, false);
        }

        function setupCGDropzone() {
            const dropzone = document.getElementById('cgDropzone');
            if (!dropzone) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.add('dragover');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, () => {
                    dropzone.classList.remove('dragover');
                }, false);
            });

            dropzone.addEventListener('drop', handleCGDrop, false);
        }

        function handleBackgroundDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                processBackgroundFile(files[0]);
            }
        }

        function handleBackgroundFile(event) {
            const file = event.target.files[0];
            if (file) {
                processBackgroundFile(file);
            }
        }

        function processBackgroundFile(file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (PNG, JPG, JPEG, WebP)');
                return;
            }

            // Get filename without extension
            const fileName = file.name;
            const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

            // Set the background sprite path (just the filename, Unity will handle the full path)
            const node = chapter.nodes[currentNodeIndex];
            if (node) {
                node.backgroundSprite = fileNameWithoutExt;
                
                // Update display
                updateBackgroundDisplay(fileNameWithoutExt);
                
                // Convert to data URL and save to cache
                const reader = new FileReader();
                reader.onload = function(e) {
                    const dataUrl = e.target.result;
                    saveBackgroundToCache(fileNameWithoutExt, dataUrl);
                    loadBackgroundPreviewFromDataUrl(dataUrl);
                };
                reader.onerror = function() {
                    alert('Error reading file. Please try again.');
                };
                reader.readAsDataURL(file);
                
                autoSaveChapter();
            }
        }

        function updateBackgroundDisplay(fileName) {
            const pathDisplay = document.getElementById('bgPathDisplay');
            if (pathDisplay) {
                pathDisplay.textContent = fileName ? BACKGROUND_ROOT_PATH + fileName : 'No background selected';
            }
        }

        function loadBackgroundPreviewFromDataUrl(dataUrl) {
            const preview = document.getElementById('bgPreview');
            const img = document.getElementById('bgPreviewImg');
            const placeholder = preview?.querySelector('.placeholder');
            
            if (!preview || !img) return;

            // Show loading state
            if (placeholder) {
                placeholder.innerHTML = '<div class="loading">Loading preview...</div>';
                placeholder.style.display = 'block';
            }

            // Load image from data URL
            img.onload = function() {
                img.classList.add('loaded');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            };

            img.onerror = function() {
                if (placeholder) {
                    placeholder.innerHTML = '<div class="placeholder">Failed to load preview</div>';
                    placeholder.style.display = 'block';
                }
                img.classList.remove('loaded');
            };

            // Add click handler to open lightbox
            img.onclick = function() {
                if (this.src) {
                    openLightbox(this.src);
                }
            };

            img.src = dataUrl;
        }

        // ============ CG Functions ============

        function handleCGDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                processCGFile(files[0]);
            }
        }

        function handleCGFile(event) {
            const file = event.target.files[0];
            if (file) {
                processCGFile(file);
            }
        }

        function processCGFile(file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file (PNG, JPG, JPEG, WebP)');
                return;
            }

            // Get filename without extension
            const fileName = file.name;
            const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

            // Set the CG sprite path (just the filename, Unity will handle the full path)
            const node = chapter.nodes[currentNodeIndex];
            if (node) {
                node.cgSprite = fileNameWithoutExt;
                
                // Update display
                updateCGDisplay(fileNameWithoutExt);
                
                // Convert to data URL and save to cache
                const reader = new FileReader();
                reader.onload = function(e) {
                    const dataUrl = e.target.result;
                    saveCGToCache(fileNameWithoutExt, dataUrl);
                    loadCGPreviewFromDataUrl(dataUrl);
                };
                reader.onerror = function() {
                    alert('Error reading file. Please try again.');
                };
                reader.readAsDataURL(file);
                
                autoSaveChapter();
            }
        }

        function updateCGDisplay(fileName) {
            const pathDisplay = document.getElementById('cgPathDisplay');
            if (pathDisplay) {
                pathDisplay.textContent = fileName ? CG_ROOT_PATH + fileName : 'No CG selected';
            }
        }

        function loadCGPreviewFromDataUrl(dataUrl) {
            const preview = document.getElementById('cgPreview');
            const img = document.getElementById('cgPreviewImg');
            const placeholder = preview?.querySelector('.placeholder');
            
            if (!preview || !img) return;

            // Show loading state
            if (placeholder) {
                placeholder.innerHTML = '<div class="loading">Loading preview...</div>';
                placeholder.style.display = 'block';
            }

            // Load image from data URL
            img.onload = function() {
                img.classList.add('loaded');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            };

            img.onerror = function() {
                if (placeholder) {
                    placeholder.innerHTML = '<div class="placeholder">Failed to load preview</div>';
                    placeholder.style.display = 'block';
                }
                img.classList.remove('loaded');
            };

            // Add click handler to open lightbox
            img.onclick = function() {
                if (this.src) {
                    openLightbox(this.src);
                }
            };

            img.src = dataUrl;
        }

        function loadCGPreviewFromCache(fileName) {
            if (!fileName) {
                clearCGPreview();
                return;
            }

            const dataUrl = getCGFromCache(fileName);
            if (dataUrl) {
                loadCGPreviewFromDataUrl(dataUrl);
            } else {
                clearCGPreview();
            }
        }

        function clearCGPreview() {
            const preview = document.getElementById('cgPreview');
            const img = document.getElementById('cgPreviewImg');
            const placeholder = preview?.querySelector('.placeholder');
            
            if (preview && img) {
                img.classList.remove('loaded');
                img.src = '';
                if (placeholder) {
                    placeholder.innerHTML = 'CG preview will appear here';
                    placeholder.style.display = 'block';
                }
            }
        }

        function clearCG() {
            const node = chapter.nodes[currentNodeIndex];
            if (node) {
                node.cgSprite = '';
                updateCGDisplay('');
                clearCGPreview();
                autoSaveChapter();
            }
        }

        function manualCGInput() {
            const fileName = prompt('Enter CG filename (without extension):');
            if (fileName !== null && fileName.trim() !== '') {
                const node = chapter.nodes[currentNodeIndex];
                if (node) {
                    node.cgSprite = fileName.trim();
                    updateCGDisplay(fileName.trim());
                    loadCGPreviewFromCache(fileName.trim());
                    autoSaveChapter();
                }
            }
        }

        // ============ Image Lightbox Functions ============

        function openLightbox(imageSrc) {
            const lightbox = document.getElementById('imageLightbox');
            const lightboxImg = document.getElementById('lightboxImage');
            
            if (lightbox && lightboxImg) {
                lightboxImg.src = imageSrc;
                lightbox.classList.add('active');
                // Prevent body scroll when lightbox is open
                document.body.style.overflow = 'hidden';
            }
        }

        function closeLightbox(event) {
            // Close if ESC key, clicking background, or close button
            const shouldClose = !event || 
                                event.key === 'Escape' ||
                                event.target.id === 'imageLightbox' || 
                                event.target.classList.contains('lightbox-close') ||
                                event.currentTarget?.classList.contains('lightbox-close');
            
            if (shouldClose) {
                const lightbox = document.getElementById('imageLightbox');
                if (lightbox) {
                    lightbox.classList.remove('active');
                    // Restore body scroll
                    document.body.style.overflow = '';
                }
            }
        }

        function loadBackgroundPreviewFromCache(fileName) {
            if (!fileName) {
                clearBackgroundPreview();
                return;
            }

            const preview = document.getElementById('bgPreview');
            const img = document.getElementById('bgPreviewImg');
            const placeholder = preview?.querySelector('.placeholder');
            
            if (!preview || !img) return;

            // Check localStorage cache
            const cachedDataUrl = getBackgroundFromCache(fileName);
            
            if (cachedDataUrl) {
                // Load from cache
                loadBackgroundPreviewFromDataUrl(cachedDataUrl);
            } else {
                // No cache available - show placeholder
                if (placeholder) {
                    placeholder.innerHTML = `<div class="placeholder">📁 ${BACKGROUND_ROOT_PATH}${fileName}<br><small>Drop the image file to preview</small></div>`;
                    placeholder.style.display = 'block';
                }
                img.classList.remove('loaded');
                img.src = '';
            }
        }

        function clearBackgroundPreview() {
            const preview = document.getElementById('bgPreview');
            const img = document.getElementById('bgPreviewImg');
            const placeholder = preview?.querySelector('.placeholder');
            
            if (img) {
                img.src = '';
                img.classList.remove('loaded');
            }
            
            if (placeholder) {
                placeholder.innerHTML = '<div class="placeholder">Preview will appear here</div>';
                placeholder.style.display = 'block';
            }
        }

        function clearBackground() {
            const node = chapter.nodes[currentNodeIndex];
            if (node) {
                node.backgroundSprite = '';
                updateBackgroundDisplay('');
                clearBackgroundPreview();
                autoSaveChapter();
            }
        }

        function manualBackgroundInput() {
            const node = chapter.nodes[currentNodeIndex];
            const currentPath = node?.backgroundSprite || '';
            
            const input = prompt('Enter background sprite filename (without path and extension):\nExample: classroom_day', currentPath);
            
            if (input !== null) {
                if (node) {
                    node.backgroundSprite = input.trim();
                    updateBackgroundDisplay(input.trim());
                    loadBackgroundPreviewFromCache(input.trim());
                    autoSaveChapter();
                }
            }
        }

        function renderChoices() {
            const node = chapter.nodes[currentNodeIndex];
            const choiceList = document.getElementById('choiceList');
            if (!choiceList) return;
            
            choiceList.innerHTML = '';
            node.choiceList.choices.forEach((choice, index) => {
                const div = document.createElement('div');
                div.className = 'choice-item';
                
                const content = document.createElement('div');
                content.className = 'choice-content';
                
                const text = document.createElement('div');
                text.className = 'choice-text';
                text.textContent = choice.choiceText || '(empty choice)';
                
                const meta = document.createElement('div');
                meta.className = 'choice-meta';
                const nextChapterInfo = choice.nextChapterName ? ` | Next Chapter: ${choice.nextChapterName}` : ' | Continues in current chapter';
                meta.textContent = `Enabled: ${choice.isEnabled !== false ? 'Yes' : 'No'}${nextChapterInfo}`;
                
                content.appendChild(text);
                content.appendChild(meta);
                
                const actions = document.createElement('div');
                actions.className = 'choice-actions';
                actions.innerHTML = `
                    <button onclick="editChoice(${index})">✏️️</button>
                    <button onclick="deleteChoice(${index})">🗑️</button>
                `;
                
                div.appendChild(content);
                div.appendChild(actions);
                choiceList.appendChild(div);
            });
        }

        // Choice management functions
        function openChoiceModal() {
            editingChoiceIndex = null;
            document.getElementById('choiceText').value = '';
            document.getElementById('choiceNextChapter').value = '';
            document.getElementById('choiceEnabled').checked = true;
            
            // Reset choice commands for new choice
            currentChoiceCommands = [];
            
            document.getElementById('choiceModal').classList.add('active');
            renderChoiceCommands();
        }

        function closeChoiceModal() {
            document.getElementById('choiceModal').classList.remove('active');
        }

        function editChoice(index) {
            const node = chapter.nodes[currentNodeIndex];
            const choice = node.choiceList.choices[index];
            
            editingChoiceIndex = index;
            document.getElementById('choiceText').value = choice.choiceText || '';
            document.getElementById('choiceNextChapter').value = choice.nextChapterName || '';
            document.getElementById('choiceEnabled').checked = choice.isEnabled !== false;
            
            // Load existing choice commands
            currentChoiceCommands = choice.onChoiceSelectedCommands ? [...choice.onChoiceSelectedCommands] : [];
            
            document.getElementById('choiceModal').classList.add('active');
            renderChoiceCommands();
        }

        function saveChoice() {
            const text = document.getElementById('choiceText').value;
            const nextChapterName = document.getElementById('choiceNextChapter').value.trim();
            const isEnabled = document.getElementById('choiceEnabled').checked;

            if (!text) {
                alert('Please enter choice text');
                return;
            }

            // Get choice commands from the modal
            const choiceCommands = getChoiceCommandsFromModal();

            // Choice structure matches Unity's DialogueChoice
            // nextChapterName: The name of the SO_StoryChapter asset (e.g., "Chapter_02")
            // Unity will resolve this string to the actual ScriptableObject reference
            const choice = {
                choiceText: text,
                nextChapterName: nextChapterName || "",  // Empty = continue in current chapter
                onChoiceSelectedEvents: [],
                onChoiceSelectedCommands: choiceCommands, // Commands to execute when this choice is selected
                isEnabled: isEnabled
            };

            const node = chapter.nodes[currentNodeIndex];

            if (editingChoiceIndex !== null) {
                node.choiceList.choices[editingChoiceIndex] = choice;
            } else {
                node.choiceList.choices.push(choice);
            }

            closeChoiceModal();
            renderChoices();
            autoSaveChapter();
        }

        function deleteChoice(index) {
            if (!confirm('Delete this choice?')) return;
            const node = chapter.nodes[currentNodeIndex];
            node.choiceList.choices.splice(index, 1);
            renderChoices();
            autoSaveChapter();
        }

        // ============ Command Management Functions ============

        function renderCommands() {
            const node = chapter.nodes[currentNodeIndex];
            const commandList = document.getElementById('commandList');
            if (!commandList) return;
            
            commandList.innerHTML = '';
            
            if (!node.commands || node.commands.length === 0) {
                commandList.innerHTML = '<div style="color: #718096; font-style: italic; padding: 10px; text-align: center;">No commands added yet</div>';
                return;
            }
            
            node.commands.forEach((command, index) => {
                const div = document.createElement('div');
                div.className = 'command-item';
                
                const content = document.createElement('div');
                content.className = 'command-content';
                
                const text = document.createElement('div');
                text.className = 'command-text';
                text.textContent = command || '(empty command)';
                
                content.appendChild(text);
                
                const actions = document.createElement('div');
                actions.className = 'command-actions';
                actions.innerHTML = `
                    <button onclick="editCommand(${index})" title="Edit">✏️</button>
                    <button onclick="deleteCommand(${index})" title="Delete">🗑️</button>
                `;
                
                div.appendChild(content);
                div.appendChild(actions);
                commandList.appendChild(div);
            });
        }

        function addCommand() {
            const command = prompt('Enter command (format: commandname parameter1 parameter2):', '');
            if (command !== null && command.trim() !== '') {
                const node = chapter.nodes[currentNodeIndex];
                if (!node.commands) {
                    node.commands = [];
                }
                node.commands.push(command.trim());
                renderCommands();
                autoSaveChapter();
            }
        }

        function editCommand(index) {
            const node = chapter.nodes[currentNodeIndex];
            const currentCommand = node.commands[index] || '';
            const newCommand = prompt('Edit command:', currentCommand);
            if (newCommand !== null) {
                node.commands[index] = newCommand.trim();
                renderCommands();
                autoSaveChapter();
            }
        }

        function deleteCommand(index) {
            if (!confirm('Delete this command?')) return;
            const node = chapter.nodes[currentNodeIndex];
            node.commands.splice(index, 1);
            renderCommands();
            autoSaveChapter();
        }

        // ============ Choice Command Management Functions ============

        let currentChoiceCommands = []; // Temporary storage for choice commands in modal

        function renderChoiceCommands() {
            const commandList = document.getElementById('choiceCommandList');
            if (!commandList) return;
            
            commandList.innerHTML = '';
            
            if (currentChoiceCommands.length === 0) {
                commandList.innerHTML = '<div style="color: #718096; font-style: italic; padding: 10px; text-align: center;">No commands added yet</div>';
                return;
            }
            
            currentChoiceCommands.forEach((command, index) => {
                const div = document.createElement('div');
                div.className = 'command-item';
                
                const content = document.createElement('div');
                content.className = 'command-content';
                
                const text = document.createElement('div');
                text.className = 'command-text';
                text.textContent = command || '(empty command)';
                
                content.appendChild(text);
                
                const actions = document.createElement('div');
                actions.className = 'command-actions';
                actions.innerHTML = `
                    <button onclick="editChoiceCommand(${index})" title="Edit">✏️</button>
                    <button onclick="deleteChoiceCommand(${index})" title="Delete">🗑️</button>
                `;
                
                div.appendChild(content);
                div.appendChild(actions);
                commandList.appendChild(div);
            });
        }

        function addChoiceCommand() {
            const command = prompt('Enter command (format: commandname parameter1 parameter2):', '');
            if (command !== null && command.trim() !== '') {
                currentChoiceCommands.push(command.trim());
                renderChoiceCommands();
            }
        }

        function editChoiceCommand(index) {
            const currentCommand = currentChoiceCommands[index] || '';
            const newCommand = prompt('Edit command:', currentCommand);
            if (newCommand !== null) {
                currentChoiceCommands[index] = newCommand.trim();
                renderChoiceCommands();
            }
        }

        function deleteChoiceCommand(index) {
            if (!confirm('Delete this command?')) return;
            currentChoiceCommands.splice(index, 1);
            renderChoiceCommands();
        }

        function getChoiceCommandsFromModal() {
            return [...currentChoiceCommands]; // Return a copy
        }

        // Import/Export functions
        // Export format:
        // {
        //   "chapter": { ... Unity SO_StoryChapter data ... },
        //   "metadata": {
        //     "version": "1.0",
        //     "exportDate": "ISO date string",
        //     "backgroundImages": { "filename": "data:image/...", ... }
        //   }
        // }
        // Unity parsers can access the chapter data via imported.chapter (new format)
        // or directly from the root (old format for backward compatibility)
        function exportJSON() {
            if (!chapter.nodes || chapter.nodes.length === 0) {
                alert('Cannot export an empty chapter. Please add some nodes first.');
                return;
            }

            // Collect all background images used in this chapter
            const usedBackgrounds = new Set();
            chapter.nodes.forEach(node => {
                if (node.backgroundSprite) {
                    usedBackgrounds.add(node.backgroundSprite);
                }
            });

            // Get cached image data for used backgrounds
            const backgroundImages = {};
            const cache = getBackgroundCache();
            usedBackgrounds.forEach(bgName => {
                if (cache[bgName]) {
                    backgroundImages[bgName] = cache[bgName].dataUrl;
                }
            });

            // Create export structure with metadata
            const exportData = {
                chapter: chapter,
                metadata: {
                    version: "1.0",
                    exportDate: new Date().toISOString(),
                    backgroundImages: backgroundImages
                }
            };

            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (chapter.fileName || chapter.chapterName || 'chapter') + '.json';
            a.click();
            URL.revokeObjectURL(url);
            
            const bgCount = Object.keys(backgroundImages).length;
            alert(`Chapter "${chapter.storyName} / ${chapter.chapterName}" exported successfully!\n\nFile: ${chapter.fileName}.json\n${bgCount} background image(s) included for cross-machine compatibility.`);
        }

        function importJSON(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    
                    // Determine if this is new format (with metadata) or old format (direct chapter)
                    let chapterData;
                    let backgroundImages = {};
                    
                    if (imported.chapter && imported.metadata) {
                        // New format with metadata
                        chapterData = imported.chapter;
                        backgroundImages = imported.metadata.backgroundImages || {};
                    } else if (imported.nodes) {
                        // Old format - direct chapter data
                        chapterData = imported;
                    } else {
                        alert('Invalid JSON structure: missing chapter or nodes data');
                        return;
                    }
                    
                    // Validate structure
                    if (!chapterData.nodes || !Array.isArray(chapterData.nodes)) {
                        alert('Invalid JSON structure: missing nodes array');
                        return;
                    }

                    // Ensure all nodes have proper structure
                    chapterData.nodes = chapterData.nodes.map(node => {
                        const mergedNode = {
                            ...createEmptyNode(),
                            ...node,
                            leftCharacter: { ...createEmptyCharacterState(), ...(node.leftCharacter || {}) },
                            centerCharacter: { ...createEmptyCharacterState(), ...(node.centerCharacter || {}) },
                            rightCharacter: { ...createEmptyCharacterState(), ...(node.rightCharacter || {}) },
                            choiceList: { choices: (node.choiceList?.choices || []) }
                        };
                        
                        // Ensure CG fields are properly initialized (migration for older data)
                        if (!mergedNode.cgAction) {
                            mergedNode.cgAction = 'None';
                        }
                        if (!mergedNode.cgSprite) {
                            mergedNode.cgSprite = '';
                        }
                        
                        return mergedNode;
                    });

                    // Import background images to cache
                    let importedBgCount = 0;
                    Object.keys(backgroundImages).forEach(bgName => {
                        const dataUrl = backgroundImages[bgName];
                        if (dataUrl) {
                            saveBackgroundToCache(bgName, dataUrl);
                            importedBgCount++;
                        }
                    });

                    // Check for background sprites that are still not in cache
                    const missingBackgrounds = [];
                    const bgCache = getBackgroundCache();
                    
                    chapterData.nodes.forEach((node, index) => {
                        if (node.backgroundSprite && !bgCache[node.backgroundSprite]) {
                            missingBackgrounds.push({ index, name: node.backgroundSprite });
                        }
                    });

                    // Create new chapter with imported data
                    chapter = chapterData;
                    // Ensure backward compatibility
                    if (!chapter.chapterName && chapter.storyName) {
                        chapter.chapterName = chapter.storyName;
                    }
                    if (!chapter.fileName) {
                        chapter.fileName = chapter.chapterName || "Chapter_01";
                    }
                    currentChapterId = generateChapterId();
                    currentNodeIndex = null;
                    hasUnsavedChanges = false;
                    
                    document.getElementById('storyName').value = chapter.storyName || 'StoryName';
                    document.getElementById('chapterName').value = chapter.chapterName || 'Chapter';
                    document.getElementById('fileName').value = chapter.fileName || 'Chapter_01';
                    closeEditor();
                    renderNodeTable();
                    updateChapterTitleBar();
                    
                    // Save the imported chapter
                    saveChapterToStorage(currentChapterId, chapter);
                    
                    // Show import success with background info
                    let message = `✅ Chapter "${chapter.storyName} / ${chapter.chapterName || chapter.storyName}" imported successfully!\n\n`;
                    message += `📁Š ${chapterData.nodes.length} node(s) imported\n`;
                    
                    if (importedBgCount > 0) {
                        message += `\n🖼️ ${importedBgCount} background image(s) imported and cached!\n`;
                    }
                    
                    if (missingBackgrounds.length > 0) {
                        message += `\n⚠️ Background Previews:\n`;
                        message += `${missingBackgrounds.length} background(s) need to be re-added for preview:\n`;
                        missingBackgrounds.slice(0, 5).forEach(bg => {
                            message += `• Node ${bg.index}: ${bg.name}\n`;
                        });
                        if (missingBackgrounds.length > 5) {
                            message += `... and ${missingBackgrounds.length - 5} more\n`;
                        }
                        message += `\nℹ️ Drag & drop the image files to restore previews.\n`;
                        message += `The paths are already set correctly in Unity.`;
                    } else {
                        const bgCount = chapterData.nodes.filter(n => n.backgroundSprite).length;
                        if (bgCount > 0) {
                            message += `\n✅ All ${bgCount} background preview(s) loaded!`;
                        }
                    }
                    
                    alert(message);
                } catch (err) {
                    alert('Error importing JSON: ' + err.message);
                    console.error('Import error:', err);
                }
            };
            reader.readAsText(file);
            
            // Reset file input
            event.target.value = '';
        }

        // ============ Character Library Management ============

        function createEmptyCharacter() {
            return {
                characterId: "",
                characterName: "",
                nameColor: { r: 1, g: 1, b: 1, a: 1 },
                heightMultiplier: 1.0,
                verticalOffset: 0.0,
                scaleSettings: {
                    farScaleMultiplier: 1.0,
                    middleScaleMultiplier: 1.0,
                    closeScaleMultiplier: 1.0
                },
                outfits: []
            };
        }

        function createEmptyOutfit() {
            return {
                outfitID: "",
                outfitName: "",
                poses: []
            };
        }

        function createEmptyPose() {
            return {
                poseID: "",
                poseName: "",
                expressions: []
            };
        }

        function createEmptyExpression() {
            return {
                fileName: "" // Original file name for reference
            };
        }


        // Character Library Storage Functions
        function loadCharacterLibrary() {
            try {
                const stored = localStorage.getItem(CHARACTER_LIBRARY_KEY);
                characterLibrary = stored ? JSON.parse(stored) : {};
            } catch (e) {
                console.error('Error loading character library:', e);
                characterLibrary = {};
            }
        }

        function saveCharacterLibrary() {
            try {
                // Save character data (metadata only, no images)
                localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary));
            } catch (e) {
                console.error('Error saving character library:', e);
                if (e.name === 'QuotaExceededError') {
                    alert('Storage limit reached!\n\nTip: Delete unused characters to free space.');
                } else {
                    alert('Error saving character library: ' + e.message);
                }
            }
        }

        function getAllCharactersArray() {
            return Object.values(characterLibrary).sort((a, b) => 
                a.characterName.localeCompare(b.characterName)
            );
        }

        // Character Library UI Functions
        function openCharacterLibrary() {
            renderCharacterLibrary();
            document.getElementById('characterLibraryModal').classList.add('active');
        }

        function closeCharacterLibrary() {
            document.getElementById('characterLibraryModal').classList.remove('active');
        }

        function renderCharacterLibrary() {
            const list = document.getElementById('characterLibraryList');
            const characters = getAllCharactersArray();
    
            list.innerHTML = '';

            if (characters.length === 0) {
                list.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #718096;">
                        <h3 style="font-size: 20px; margin-bottom: 10px; color: #a0aec0;">No Characters Yet</h3>
                        <p>Create your first character to get started!</p>
                    </div>
                `;
                return;
            }

            characters.forEach(character => {
                const card = document.createElement('div');
                card.className = 'character-card-item';

                const outfitCount = character.outfits?.length || 0;
                let totalPoses = 0;
                let totalExpressions = 0;
                character.outfits?.forEach(outfit => {
                    totalPoses += outfit.poses?.length || 0;
                    outfit.poses?.forEach(pose => {
                        totalExpressions += pose.expressions?.length || 0;
                    });
                });

                card.innerHTML = `
                    <div class="character-card-item-header">
                        <div>
                            <div class="character-card-item-title">${character.characterName || 'Unnamed'}</div>
                            <div class="character-card-item-id">ID: ${character.characterId || 'none'}</div>
                            <div class="character-card-item-meta">${outfitCount} outfit(s) | ${totalPoses} pose(s) | ${totalExpressions} expression(s)</div>
                        </div>
                        <div class="character-card-item-actions">
                            <button onclick="editCharacter('${character.characterId}', event)" title="Edit">✏️</button>
                            <button onclick="exportCharacter('${character.characterId}', event)" title="Export">💾</button>
                            <button class="delete-character" onclick="deleteCharacterFromLibrary('${character.characterId}', event)" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;

                card.onclick = (e) => {
                    if (e.target.tagName !== 'BUTTON') {
                        editCharacter(character.characterId);
                    }
                };

                list.appendChild(card);
            });
        }

        function createNewCharacter() {
            currentEditingCharacter = createEmptyCharacter();
            currentEditingCharacterId = null; // New character
            openCharacterEditor();
        }

        function editCharacter(characterId, event) {
            if (event) event.stopPropagation();
            
            if (!characterLibrary[characterId]) {
                alert('Character not found!');
                return;
            }

            // Deep clone to avoid direct mutations
            currentEditingCharacter = JSON.parse(JSON.stringify(characterLibrary[characterId]));
            currentEditingCharacterId = characterId;
            openCharacterEditor();
        }

        function deleteCharacterFromLibrary(characterId, event) {
            if (event) event.stopPropagation();
            
            const character = characterLibrary[characterId];
            if (!character) return;

            if (!confirm(`Delete character "${character.characterName}" (${characterId})?\n\nThis cannot be undone!`)) {
                return;
            }

            delete characterLibrary[characterId];
            saveCharacterLibrary();
            renderCharacterLibrary();
            alert('Character deleted!');
        }

        function openCharacterEditor() {
            const title = document.getElementById('characterEditorTitle');
            title.textContent = currentEditingCharacterId ? 'Edit Character' : 'Create New Character';
            renderCharacterEditor();
            document.getElementById('characterEditorModal').classList.add('active');
        }

        function closeCharacterEditor() {
            document.getElementById('characterEditorModal').classList.remove('active');
            currentEditingCharacter = null;
            currentEditingCharacterId = null;
        }

        function renderCharacterEditor() {
            const editorArea = document.getElementById('characterEditorArea');
            if (!currentEditingCharacter) return;

            const char = currentEditingCharacter;
            const colorHex = rgbaToHex(char.nameColor);

            // Initialize body parameters if they don't exist
            if (!char.heightMultiplier) char.heightMultiplier = 1.0;
            if (!char.verticalOffset) char.verticalOffset = 0.0;
            if (!char.scaleSettings) {
                char.scaleSettings = {
                    farScaleMultiplier: 1.0,
                    middleScaleMultiplier: 1.0,
                    closeScaleMultiplier: 1.0
                };
            }

            editorArea.innerHTML = `
                <div class="character-editor-grid">
                    <!-- Basic Info -->
                    <div class="form-group">
                        <label>Character ID *</label>
                        <input type="text" id="charId" value="${char.characterId || ''}" placeholder="e.g., 0, 1, 2">
                        <small style="color: #718096; font-size: 11px;">Unique identifier for this character.</small>
                    </div>

                    <div class="form-group">
                        <label>Character Name *</label>
                        <input type="text" id="charName" value="${char.characterName || ''}" placeholder="e.g., Alice Smith">
                    </div>

                    <div class="form-group">
                        <label>Name Color</label>
                        <div class="color-picker-wrapper">
                            <input type="color" id="charColor" value="${colorHex}">
                            <div class="color-preview">${colorHex}</div>
                        </div>
                    </div>

                    <!-- Character Body Parameters -->
                    <div class="section-header">
                        Character Body Parameters
                        <button class="reset-body-params-btn" onclick="resetBodyParameters()" title="Reset to default values">🔄 Reset</button>
                    </div>
                    
                    <div class="form-group">
                        <label>Height Multiplier</label>
                        <div class="range-input-wrapper">
                            <input type="range" id="heightMultiplier" min="0.5" max="2.0" step="0.01" 
                                   value="${char.heightMultiplier}" 
                                   onchange="updateCharacterBodyParam('heightMultiplier', parseFloat(this.value))">
                            <div class="range-value">${char.heightMultiplier.toFixed(2)}</div>
                        </div>
                        <small style="color: #718096; font-size: 11px;">Base height scaling (1.0 = normal height)</small>
                    </div>

                    <div class="form-group">
                        <label>Vertical Offset</label>
                        <div class="range-input-wrapper">
                            <input type="range" id="verticalOffset" min="-2.0" max="2.0" step="0.01" 
                                   value="${char.verticalOffset}" 
                                   onchange="updateCharacterBodyParam('verticalOffset', parseFloat(this.value))">
                            <div class="range-value">${char.verticalOffset.toFixed(2)}</div>
                        </div>
                        <small style="color: #718096; font-size: 11px;">Vertical position adjustment</small>
                    </div>

                    <div class="form-group">
                        <label>Camera Range Scale Multipliers</label>
                        <div class="scale-settings-grid">
                            <div class="scale-setting">
                                <label>Far Range</label>
                                <div class="range-input-wrapper">
                                    <input type="range" id="farScaleMultiplier" min="0.5" max="2.0" step="0.01" 
                                           value="${char.scaleSettings.farScaleMultiplier}" 
                                           onchange="updateCharacterBodyParam('scaleSettings.farScaleMultiplier', parseFloat(this.value))">
                                    <div class="range-value">${char.scaleSettings.farScaleMultiplier.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="scale-setting">
                                <label>Middle Range</label>
                                <div class="range-input-wrapper">
                                    <input type="range" id="middleScaleMultiplier" min="0.5" max="2.0" step="0.01" 
                                           value="${char.scaleSettings.middleScaleMultiplier}" 
                                           onchange="updateCharacterBodyParam('scaleSettings.middleScaleMultiplier', parseFloat(this.value))">
                                    <div class="range-value">${char.scaleSettings.middleScaleMultiplier.toFixed(2)}</div>
                                </div>
                            </div>
                            <div class="scale-setting">
                                <label>Close Range</label>
                                <div class="range-input-wrapper">
                                    <input type="range" id="closeScaleMultiplier" min="0.5" max="2.0" step="0.01" 
                                           value="${char.scaleSettings.closeScaleMultiplier}" 
                                           onchange="updateCharacterBodyParam('scaleSettings.closeScaleMultiplier', parseFloat(this.value))">
                                    <div class="range-value">${char.scaleSettings.closeScaleMultiplier.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                        <small style="color: #718096; font-size: 11px;">Fine-tune scaling for different camera ranges</small>
                    </div>

                    <!-- Outfits Section -->
                    <div class="section-header">Outfits</div>
                    <div id="outfitsContainer"></div>
                    <button class="add-outfit-btn" onclick="addOutfit()">+ Add Outfit</button>
                </div>
            `;

            // Setup color picker listener
            document.getElementById('charColor').addEventListener('input', function() {
                document.querySelector('.color-preview').textContent = this.value;
            });

            // Setup range input listeners for real-time value updates
            setupRangeInputListeners();

            // Render outfits
            renderOutfits();
        }

        function renderOutfits() {
            const container = document.getElementById('outfitsContainer');
            if (!container || !currentEditingCharacter) return;

            container.innerHTML = '';

            currentEditingCharacter.outfits.forEach((outfit, outfitIndex) => {
                const outfitSection = document.createElement('div');
                outfitSection.className = 'outfit-section';
                outfitSection.innerHTML = `
                    <div class="outfit-header">
                        <h3>Outfit ${outfitIndex}: ${outfit.outfitName || 'Unnamed'}</h3>
                        <div class="outfit-actions">
                            <button onclick="deleteOutfit(${outfitIndex})">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Outfit ID</label>
                        <input type="text" value="${outfit.outfitID || ''}" onchange="updateOutfitField(${outfitIndex}, 'outfitID', this.value)" placeholder="e.g., 0, 1, 2">
                    </div>
                    <div class="form-group">
                        <label>Outfit Name</label>
                        <input type="text" value="${outfit.outfitName || ''}" onchange="updateOutfitField(${outfitIndex}, 'outfitName', this.value)" placeholder="e.g., School, Casual">
                    </div>
                    <div class="section-header" style="font-size: 14px;">Poses</div>
                    <div id="posesContainer${outfitIndex}"></div>
                    <button class="add-pose-btn" onclick="addPose(${outfitIndex})">+ Add Pose</button>
                `;

                container.appendChild(outfitSection);

                // Render poses for this outfit
                renderPoses(outfitIndex);
            });
        }

        function renderPoses(outfitIndex) {
            const container = document.getElementById(`posesContainer${outfitIndex}`);
            if (!container || !currentEditingCharacter) return;

            const outfit = currentEditingCharacter.outfits[outfitIndex];
            container.innerHTML = '';

            outfit.poses.forEach((pose, poseIndex) => {
                const poseSection = document.createElement('div');
                poseSection.className = 'pose-section';
                poseSection.innerHTML = `
                    <div class="pose-header">
                        <h4>Pose ${poseIndex}: ${pose.poseName || 'Unnamed'}</h4>
                        <div class="pose-actions">
                            <button onclick="deletePose(${outfitIndex}, ${poseIndex})">🗑️</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Pose ID</label>
                        <input type="text" value="${pose.poseID || ''}" onchange="updatePoseField(${outfitIndex}, ${poseIndex}, 'poseID', this.value)" placeholder="e.g., 0, 1, 2">
                    </div>
                    <div class="form-group">
                        <label>Pose Name</label>
                        <input type="text" value="${pose.poseName || ''}" onchange="updatePoseField(${outfitIndex}, ${poseIndex}, 'poseName', this.value)" placeholder="e.g., Normal, Arms_Crossed">
                    </div>
                    <div class="section-header" style="font-size: 13px;">Expressions</div>
                    <div class="expression-grid" id="expressionsGrid${outfitIndex}_${poseIndex}"></div>
                `;

                container.appendChild(poseSection);

                // Render expressions for this pose
                renderExpressions(outfitIndex, poseIndex);
            });
        }

        function renderExpressions(outfitIndex, poseIndex) {
            const container = document.getElementById(`expressionsGrid${outfitIndex}_${poseIndex}`);
            if (!container || !currentEditingCharacter) return;

            const pose = currentEditingCharacter.outfits[outfitIndex].poses[poseIndex];
            container.innerHTML = '';

            pose.expressions.forEach((expr, exprIndex) => {
                const exprDiv = document.createElement('div');
                exprDiv.className = 'expression-item';
                
                // Show file name instead of preview image
                const fileName = expr.fileName || `Expression ${exprIndex}`;
                const previewHtml = `<div class="placeholder">${fileName}</div>`;
                
                exprDiv.innerHTML = `
                    <button class="expression-delete" onclick="deleteExpression(${outfitIndex}, ${poseIndex}, ${exprIndex}); event.stopPropagation();">×</button>
                    <div class="expression-preview">
                        ${previewHtml}
                    </div>
                    <div class="expression-index">Expression ${exprIndex}</div>
                `;
                container.appendChild(exprDiv);
            });

            // Add "Add Expression" button
            const addBtn = document.createElement('div');
            addBtn.className = 'expression-item';
            addBtn.innerHTML = `
                <input type="file" id="exprFile${outfitIndex}_${poseIndex}" accept="image/*" style="display: none;" onchange="addExpression(${outfitIndex}, ${poseIndex}, event)">
                <button class="add-expression-btn" onclick="document.getElementById('exprFile${outfitIndex}_${poseIndex}').click()">
                    <div>+</div>
                    <div style="font-size: 11px; margin-top: 5px;">Add</div>
                </button>
            `;
            container.appendChild(addBtn);
        }

        function addOutfit() {
            if (!currentEditingCharacter) return;
            currentEditingCharacter.outfits.push(createEmptyOutfit());
            renderOutfits();
        }

        function deleteOutfit(outfitIndex) {
            if (!currentEditingCharacter) return;
            if (!confirm('Delete this outfit and all its poses?')) return;
            currentEditingCharacter.outfits.splice(outfitIndex, 1);
            renderOutfits();
        }

        function addPose(outfitIndex) {
            if (!currentEditingCharacter) return;
            currentEditingCharacter.outfits[outfitIndex].poses.push(createEmptyPose());
            renderPoses(outfitIndex);
        }

        function deletePose(outfitIndex, poseIndex) {
            if (!currentEditingCharacter) return;
            if (!confirm('Delete this pose and all its expressions?')) return;
            currentEditingCharacter.outfits[outfitIndex].poses.splice(poseIndex, 1);
            renderPoses(outfitIndex);
        }

        function addExpression(outfitIndex, poseIndex, event) {
            if (!currentEditingCharacter) return;
            
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Create expression with file name only
            const expr = createEmptyExpression();
            expr.fileName = file.name;
            
            currentEditingCharacter.outfits[outfitIndex].poses[poseIndex].expressions.push(expr);
            renderExpressions(outfitIndex, poseIndex);
            
            console.log(`Added expression: ${file.name}`);

            // Reset file input
            event.target.value = '';
        }

        function deleteExpression(outfitIndex, poseIndex, exprIndex) {
            if (!currentEditingCharacter) return;
            currentEditingCharacter.outfits[outfitIndex].poses[poseIndex].expressions.splice(exprIndex, 1);
            renderExpressions(outfitIndex, poseIndex);
        }

        function updateOutfitField(outfitIndex, field, value) {
            if (!currentEditingCharacter) return;
            currentEditingCharacter.outfits[outfitIndex][field] = value;
        }

        function updatePoseField(outfitIndex, poseIndex, field, value) {
            if (!currentEditingCharacter) return;
            currentEditingCharacter.outfits[outfitIndex].poses[poseIndex][field] = value;
        }

        function updateCharacterBodyParam(fieldPath, value) {
            if (!currentEditingCharacter) return;
            
            // Handle nested properties like scaleSettings.farScaleMultiplier
            if (fieldPath.includes('.')) {
                const parts = fieldPath.split('.');
                let obj = currentEditingCharacter;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!obj[parts[i]]) {
                        obj[parts[i]] = {};
                    }
                    obj = obj[parts[i]];
                }
                obj[parts[parts.length - 1]] = value;
            } else {
                currentEditingCharacter[fieldPath] = value;
            }
            
            // Update the range value display with 2 decimal places
            const rangeValueElement = document.querySelector(`#${fieldPath.replace('.', '')} + .range-value`);
            if (rangeValueElement) {
                rangeValueElement.textContent = value.toFixed(2);
            }
        }

        function resetBodyParameters() {
            if (!currentEditingCharacter) return;
            
            // Reset to default values
            currentEditingCharacter.heightMultiplier = 1.0;
            currentEditingCharacter.verticalOffset = 0.0;
            currentEditingCharacter.scaleSettings = {
                farScaleMultiplier: 1.0,
                middleScaleMultiplier: 1.0,
                closeScaleMultiplier: 1.0
            };
            
            // Update all range inputs and displays
            const heightInput = document.getElementById('heightMultiplier');
            const verticalInput = document.getElementById('verticalOffset');
            const farInput = document.getElementById('farScaleMultiplier');
            const middleInput = document.getElementById('middleScaleMultiplier');
            const closeInput = document.getElementById('closeScaleMultiplier');
            
            if (heightInput) {
                heightInput.value = 1.0;
                heightInput.nextElementSibling.textContent = '1.00';
            }
            if (verticalInput) {
                verticalInput.value = 0.0;
                verticalInput.nextElementSibling.textContent = '0.00';
            }
            if (farInput) {
                farInput.value = 1.0;
                farInput.nextElementSibling.textContent = '1.00';
            }
            if (middleInput) {
                middleInput.value = 1.0;
                middleInput.nextElementSibling.textContent = '1.00';
            }
            if (closeInput) {
                closeInput.value = 1.0;
                closeInput.nextElementSibling.textContent = '1.00';
            }
            
            // Show confirmation
            alert('Body parameters reset to default values!');
        }

        function setupRangeInputListeners() {
            // Setup real-time value updates for all range inputs
            const rangeInputs = document.querySelectorAll('input[type="range"]');
            rangeInputs.forEach(input => {
                input.addEventListener('input', function() {
                    const valueDisplay = this.parentElement.querySelector('.range-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = parseFloat(this.value).toFixed(2);
                    }
                });
            });
        }

        function saveCharacter() {
            if (!currentEditingCharacter) return;

            // Get values from form
            const charId = document.getElementById('charId')?.value.trim();
            const charName = document.getElementById('charName')?.value.trim();
            const charColor = document.getElementById('charColor')?.value;

            // Validate
            if (!charId) {
                alert('Character ID is required!');
                return;
            }

            if (!charName) {
                alert('Character Name is required!');
                return;
            }

            // Check for duplicate ID (excluding current character if editing)
            if (characterLibrary[charId] && charId !== currentEditingCharacterId) {
                alert(`Character ID "${charId}" already exists! Please choose a different ID.`);
                return;
            }

            // Update character data
            currentEditingCharacter.characterId = charId;
            currentEditingCharacter.characterName = charName;
            currentEditingCharacter.nameColor = hexToRgba(charColor);

            // If editing existing character with different ID, remove old entry
            if (currentEditingCharacterId && currentEditingCharacterId !== charId) {
                delete characterLibrary[currentEditingCharacterId];
            }

            // Save to library
            characterLibrary[charId] = currentEditingCharacter;
            saveCharacterLibrary();

            closeCharacterEditor();
            renderCharacterLibrary();
            
            alert(`Character "${charName}" saved successfully!`);
        }

        // Character Export/Import
        function exportCharacter(characterId, event) {
            if (event) event.stopPropagation();

            const character = characterLibrary[characterId];
            if (!character) {
                alert('Character not found!');
                return;
            }

            // Create clean export without preview images (only structure for Unity)
            const cleanCharacter = {
                characterId: character.characterId,
                characterName: character.characterName,
                nameColor: character.nameColor,
                heightMultiplier: character.heightMultiplier || 1.0,
                verticalOffset: character.verticalOffset || 0.0,
                scaleSettings: character.scaleSettings || {
                    farScaleMultiplier: 1.0,
                    middleScaleMultiplier: 1.0,
                    closeScaleMultiplier: 1.0
                },
                outfits: character.outfits.map(outfit => ({
                    outfitID: outfit.outfitID,
                    outfitName: outfit.outfitName,
                    poses: outfit.poses.map(pose => ({
                        poseID: pose.poseID,
                        poseName: pose.poseName,
                        expressions: pose.expressions.map(expr => ({
                            fileName: expr.fileName || ""
                        })) // File names only, no image data
                    }))
                }))
            };

            const exportData = {
                version: "1.0",
                exportDate: new Date().toISOString(),
                character: cleanCharacter
            };

            const json = JSON.stringify(exportData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Character_${character.characterId}.json`;
            a.click();
            URL.revokeObjectURL(url);

            let totalExpressions = 0;
            character.outfits?.forEach(outfit => {
                outfit.poses?.forEach(pose => {
                    totalExpressions += pose.expressions?.length || 0;
                });
            });

            alert(`Character "${character.characterName}" exported!\n\n` +
                  `${character.outfits?.length || 0} outfit(s) with ${totalExpressions} expression(s).\n\n` +
                  `Note: Lightweight metadata only. Unity importer expects sprite files in your project.`);
        }

        function importCharacterJSON(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const imported = JSON.parse(e.target.result);
                    
                    let character;
                    if (imported.character && imported.version) {
                        // New format with metadata
                        character = imported.character;
                    } else if (imported.characterId) {
                        // Old format - direct character data
                        character = imported;
                    } else {
                        alert('Invalid character JSON structure');
                        return;
                    }

                    // Validate
                    if (!character.characterId) {
                        alert('Character ID is missing in the imported file');
                        return;
                    }

                    // Check for duplicate
                    if (characterLibrary[character.characterId]) {
                        if (!confirm(`Character "${character.characterId}" already exists. Overwrite?`)) {
                            return;
                        }
                    }

                    // Ensure proper structure
                    character.outfits = character.outfits || [];
                    character.nameColor = character.nameColor || { r: 1, g: 1, b: 1, a: 1 };

                    // Save to library
                    characterLibrary[character.characterId] = character;
                    saveCharacterLibrary();
                    renderCharacterLibrary();

                    let totalExpressions = 0;
                    character.outfits?.forEach(outfit => {
                        outfit.poses?.forEach(pose => {
                            totalExpressions += pose.expressions?.length || 0;
                        });
                    });

                    alert(`✅ Character "${character.characterName}" imported successfully!\n\n` +
                          `${character.outfits?.length || 0} outfit(s) with ${totalExpressions} expression(s) loaded.`);
                } catch (err) {
                    alert('Error importing character: ' + err.message);
                    console.error('Import error:', err);
                }
            };
            reader.readAsText(file);

            // Reset file input
            event.target.value = '';
        }

        // ============ Bulk Folder Import ============
        
        let bulkImportParsedCharacter = null;

        function openBulkImportModal() {
            document.getElementById('bulkImportModal').classList.add('active');
            document.getElementById('bulkImportPreview').style.display = 'none';
            document.getElementById('bulkImportConfirmBtn').style.display = 'none';
            bulkImportParsedCharacter = null;
            
            // Setup file input listener
            const fileInput = document.getElementById('bulkImportFolderInput');
            fileInput.value = '';
            fileInput.onchange = handleBulkImportFolder;
        }

        function closeBulkImportModal() {
            document.getElementById('bulkImportModal').classList.remove('active');
            bulkImportParsedCharacter = null;
        }

        async function handleBulkImportFolder(event) {
            const files = Array.from(event.target.files);
            
            if (files.length === 0) {
                alert('No files selected. Please select a character folder.');
                return;
            }

            // Show processing message
            const previewDiv = document.getElementById('bulkImportPreview');
            const previewContent = document.getElementById('bulkImportPreviewContent');
            previewDiv.style.display = 'block';
            previewContent.innerHTML = '<p style="color: #a0aec0;">Processing folder structure and compressing preview images... Please wait.</p>';

            try {
                const character = await parseBulkImportFolder(files);
                
                if (!character) {
                    throw new Error('Failed to parse folder structure. Please check the format.');
                }

                bulkImportParsedCharacter = character;
                renderBulkImportPreview(character);
                document.getElementById('bulkImportConfirmBtn').style.display = 'block';
            } catch (error) {
                previewContent.innerHTML = `
                    <p style="color: #fc8181;">❌ Error: ${error.message}</p>
                    <p style="color: #a0aec0; font-size: 12px; margin-top: 10px;">
                        Make sure your folder structure matches:<br>
                        CharacterName/OutfitID_OutfitName/PoseID_PoseName/expression_N.png
                    </p>
                `;
                document.getElementById('bulkImportConfirmBtn').style.display = 'none';
            }
        }

        async function parseBulkImportFolder(files) {
            // Group files by path structure
            const filesByPath = {};
            
            files.forEach(file => {
                const path = file.webkitRelativePath || file.name;
                filesByPath[path] = file;
            });

            // Extract character name from root folder
            const paths = Object.keys(filesByPath);
            if (paths.length === 0) {
                throw new Error('No files found in the selected folder.');
            }

            const rootPath = paths[0].split('/')[0];
            const characterName = rootPath;
            
            // Parse folder structure
            const outfitsMap = {};
            
            for (const path of paths) {
                const parts = path.split('/');
                
                // Expected: CharacterName/OutfitFolder/PoseFolder/filename.png
                if (parts.length !== 4) continue;
                
                const [charFolder, outfitFolder, poseFolder, fileName] = parts;
                
                // Check if it's an image file
                if (!fileName.match(/\.(png|jpg|jpeg|webp)$/i)) continue;
                
                // Parse outfit folder (format: ID_Name)
                const outfitMatch = outfitFolder.match(/^(\d+)_(.+)$/);
                if (!outfitMatch) continue;
                
                const [, outfitID, outfitName] = outfitMatch;
                
                // Parse pose folder (format: ID_Name)
                const poseMatch = poseFolder.match(/^(\d+)_(.+)$/);
                if (!poseMatch) continue;
                
                const [, poseID, poseName] = poseMatch;
                
                // Initialize outfit if needed
                if (!outfitsMap[outfitID]) {
                    outfitsMap[outfitID] = {
                        outfitID: outfitID,
                        outfitName: outfitName,
                        poses: {}
                    };
                }
                
                // Initialize pose if needed
                if (!outfitsMap[outfitID].poses[poseID]) {
                    outfitsMap[outfitID].poses[poseID] = {
                        poseID: poseID,
                        poseName: poseName,
                        expressions: []
                    };
                }
                
                // Add file to expressions
                outfitsMap[outfitID].poses[poseID].expressions.push({
                    fileName: fileName,
                    file: filesByPath[path]
                });
            }

            // Convert maps to arrays and sort
            const outfits = Object.values(outfitsMap).sort((a, b) => 
                parseInt(a.outfitID) - parseInt(b.outfitID)
            );

            outfits.forEach(outfit => {
                outfit.poses = Object.values(outfit.poses).sort((a, b) => 
                    parseInt(a.poseID) - parseInt(b.poseID)
                );
                
                // Sort expressions by filename (expression_0, expression_1, etc.)
                outfit.poses.forEach(pose => {
                    pose.expressions.sort((a, b) => {
                        const aNum = parseInt(a.fileName.match(/\d+/)?.[0] || 0);
                        const bNum = parseInt(b.fileName.match(/\d+/)?.[0] || 0);
                        return aNum - bNum;
                    });
                });
            });

            if (outfits.length === 0) {
                throw new Error('No valid outfit folders found. Expected format: OutfitID_OutfitName');
            }

            // Store file names only (no image compression)
            for (const outfit of outfits) {
                for (const pose of outfit.poses) {
                    const expressions = [];
                    
                    for (const expr of pose.expressions) {
                        expressions.push({
                            fileName: expr.fileName
                        });
                    }
                    
                    pose.expressions = expressions;
                }
            }

            // Generate character ID from name (lowercase, underscores)
            const characterId = characterName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            return {
                characterId: characterId,
                characterName: characterName,
                nameColor: { r: 1, g: 1, b: 1, a: 1 },
                outfits: outfits
            };
        }

        function readFileAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function renderBulkImportPreview(character) {
            const previewContent = document.getElementById('bulkImportPreviewContent');
            
            let totalExpressions = 0;
            character.outfits.forEach(outfit => {
                outfit.poses.forEach(pose => {
                    totalExpressions += pose.expressions.length;
                });
            });

            let html = `
                <div style="color: #e2e8f0; margin-bottom: 15px;">
                    <h3 style="color: #48bb78; margin-bottom: 10px;">✅ Successfully Parsed!</h3>
                    <p><strong>Character Name:</strong> ${character.characterName}</p>
                    <p><strong>Character ID:</strong> ${character.characterId}</p>
                    <p><strong>Outfits:</strong> ${character.outfits.length}</p>
                    <p><strong>Total Expressions:</strong> ${totalExpressions}</p>
                </div>
                <div style="border-top: 1px solid #2d3748; padding-top: 15px;">
                    <h4 style="color: #cbd5e0; margin-bottom: 10px;">Structure Details:</h4>
            `;

            character.outfits.forEach(outfit => {
                html += `
                    <div style="margin-bottom: 10px; padding: 10px; background: #1a1f2e; border-radius: 4px;">
                        <div style="color: #63b3ed; font-weight: 600;">📦 Outfit ${outfit.outfitID}: ${outfit.outfitName}</div>
                `;
                
                outfit.poses.forEach(pose => {
                    html += `
                        <div style="margin-left: 20px; margin-top: 5px; color: #a0aec0; font-size: 12px;">
                            └─ Pose ${pose.poseID}: ${pose.poseName} (${pose.expressions.length} expression(s))
                        </div>
                    `;
                });
                
                html += `</div>`;
            });

            html += `</div>`;
            previewContent.innerHTML = html;
        }

        function confirmBulkImport() {
            if (!bulkImportParsedCharacter) {
                alert('No character data to import.');
                return;
            }

            const character = bulkImportParsedCharacter;

            // Check for duplicate ID
            if (characterLibrary[character.characterId]) {
                if (!confirm(`Character ID "${character.characterId}" already exists. Overwrite?`)) {
                    return;
                }
            }

            // Save to library
            characterLibrary[character.characterId] = character;
            saveCharacterLibrary();

            let totalExpressions = 0;
            character.outfits.forEach(outfit => {
                outfit.poses.forEach(pose => {
                    totalExpressions += pose.expressions.length;
                });
            });

            alert(`✅ Character "${character.characterName}" imported successfully!\n\n` +
                  `Outfits: ${character.outfits.length}\n` +
                  `Expressions: ${totalExpressions} (compressed to tiny previews)\n\n` +
                  `The character is now available in your library with preview images!`);

            closeBulkImportModal();
            renderCharacterLibrary();
        }

        // Character Picker for Node Editor
        function openCharacterPicker(position, nodeIndex) {
            currentPickerTarget = { position, nodeIndex };
            
            const node = chapter.nodes[nodeIndex];
            const charKey = position + 'Character';
            const currentCharId = node[charKey]?.characterId || '';
            
            document.getElementById('pickerCharacterIdDisplay').value = currentCharId;
            document.getElementById('pickerCharacterNameDisplay').value = '';
            renderCharacterPicker(currentCharId);
            document.getElementById('characterPickerModal').classList.add('active');
        }

        function closeCharacterPicker() {
            document.getElementById('characterPickerModal').classList.remove('active');
            currentPickerTarget = null;
        }

        function renderCharacterPicker(selectedCharId) {
            const list = document.getElementById('characterPickerList');
            const characters = getAllCharactersArray();
            
            list.innerHTML = '';

            if (characters.length === 0) {
                list.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #718096;">
                        <p>No characters in library. Create characters first or enter ID manually.</p>
                    </div>
                `;
                return;
            }

            characters.forEach(character => {
                const item = document.createElement('div');
                item.className = 'character-picker-item';
                if (character.characterId === selectedCharId) {
                    item.classList.add('selected');
                }

                item.innerHTML = `
                    <div class="character-picker-item-name">${character.characterName}</div>
                    <div class="character-picker-item-id">${character.characterId}</div>
                `;

                item.onclick = () => {
                    document.querySelectorAll('.character-picker-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    
                    const idInput = document.getElementById('pickerCharacterIdDisplay');
                    const nameInput = document.getElementById('pickerCharacterNameDisplay');
                    
                    // Smooth transition without blank flash
                    idInput.style.transition = 'all 0.2s ease';
                    nameInput.style.transition = 'all 0.2s ease';
                    
                    idInput.value = character.characterId;
                    nameInput.value = character.characterName;
                    
                    // Add visual feedback to both fields
                    idInput.style.borderColor = '#5a67d8';
                    idInput.style.backgroundColor = '#f7fafc';
                    nameInput.style.borderColor = '#5a67d8';
                    nameInput.style.backgroundColor = '#f7fafc';
                    
                    // Reset after a moment
                    setTimeout(() => {
                        idInput.style.borderColor = '';
                        idInput.style.backgroundColor = '';
                        idInput.style.transition = '';
                        nameInput.style.borderColor = '';
                        nameInput.style.backgroundColor = '';
                        nameInput.style.transition = '';
                    }, 1000);
                };

                list.appendChild(item);
            });
        }

        function applyCharacterPick() {
            if (!currentPickerTarget) return;

            const charId = document.getElementById('pickerCharacterIdDisplay').value.trim();
            const { position, nodeIndex } = currentPickerTarget;
            
            if (!charId) {
                alert('Please select a character from the library.');
                return;
            }
            
            const node = chapter.nodes[nodeIndex];
            const charKey = position + 'Character';
            
            if (node && node[charKey]) {
                node[charKey].characterId = charId;
                
                // Update character name display immediately
                updateCharacterNameDisplay(position);
                
                // Force refresh the node editor if it's currently open
                if (document.getElementById('editorModal').classList.contains('active')) {
                    renderEditor(); // Re-render the entire editor
                }
                
                updateTableAndModal();
            }

            closeCharacterPicker();
        }

        // Helper functions
        function rgbaToHex(rgba) {
            const r = Math.round((rgba.r || 0) * 255);
            const g = Math.round((rgba.g || 0) * 255);
            const b = Math.round((rgba.b || 0) * 255);
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

        function hexToRgba(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16) / 255,
                g: parseInt(result[2], 16) / 255,
                b: parseInt(result[3], 16) / 255,
                a: 1
            } : { r: 1, g: 1, b: 1, a: 1 };
        }

        function hexToRgb(hex) {
            return hexToRgba(hex);
        }

        function rgbToHex(rgb) {
            if (!rgb) return '#000000';
            const r = Math.round((rgb.r || 0) * 255);
            const g = Math.round((rgb.g || 0) * 255);
            const b = Math.round((rgb.b || 0) * 255);
            return '#' + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            }).join('');
        }

        // ============ LocalStorage Management ============
        
        function generateChapterId() {
            return 'chapter_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        function getAllChapters() {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        }

        function saveChapterToStorage(chapterId, chapterData) {
            const chapters = getAllChapters();
            chapters[chapterId] = {
                id: chapterId,
                data: chapterData,
                lastModified: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
        }

        function deleteChapterFromStorage(chapterId) {
            const chapters = getAllChapters();
            delete chapters[chapterId];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chapters));
        }

        function clearAllData() {
            const chapters = getAllChapters();
            const chapterCount = Object.keys(chapters).length;
            const bgCache = getBackgroundCache();
            const bgCount = Object.keys(bgCache).length;
            
            const characters = Object.keys(characterLibrary);
            const characterCount = characters.length;
            
            if (chapterCount === 0 && bgCount === 0 && characterCount === 0) {
                alert('No data to clear! Storage is already empty.');
                return;
            }

            const confirmation = confirm(
                `⚠️ WARNING: This will permanently delete:\n\n` +
                `• ${chapterCount} saved chapter(s)\n` +
                `• ${bgCount} background cache image(s)\n` +
                `• ${characterCount} character(s) in library\n\n` +
                `This action cannot be undone!\n\n` +
                `Are you absolutely sure you want to continue?`
            );

            if (!confirmation) return;

            // Ask about background cache separately
            let clearBackgrounds = false;
            if (bgCount > 0) {
                clearBackgrounds = confirm(
                    `Do you also want to clear the background image cache?\n\n` +
                    `• If YES: All ${bgCount} background preview(s) will be deleted\n` +
                    `• If NO: Background previews will remain for future use\n\n` +
                    `Recommendation: Keep backgrounds if you plan to import chapters later.`
                );
            }

            // Ask about character library separately
            let clearCharacters = false;
            if (characterCount > 0) {
                clearCharacters = confirm(
                    `Do you also want to clear the Character Library?\n\n` +
                    `• If YES: All ${characterCount} character(s) with preview images will be deleted\n` +
                    `• If NO: Character library will remain intact\n\n` +
                    `Recommendation: Keep characters if you plan to reuse them in other stories.`
                );
            }

            // Clear localStorage
            localStorage.removeItem(STORAGE_KEY);
            
            if (clearBackgrounds) {
                localStorage.removeItem(BACKGROUND_CACHE_KEY);
            }

            if (clearCharacters) {
                localStorage.removeItem(CHARACTER_LIBRARY_KEY);
                characterLibrary = {};
            }

            // Create a fresh chapter
            chapter = {
                storyName: "StoryName",
                chapterName: "Chapter",
                fileName: "SO_StoryName_Chapter",
                nodes: []
            };
            currentChapterId = null;
            currentNodeIndex = null;
            hasUnsavedChanges = false;

            document.getElementById('storyName').value = chapter.storyName;
            document.getElementById('chapterName').value = chapter.chapterName;
            document.getElementById('fileName').value = chapter.fileName;
            closeEditor();
            renderNodeTable();
            updateChapterTitleBar();

            // Build result message
            let clearedItems = ['Chapter data'];
            if (clearBackgrounds) clearedItems.push('background cache');
            if (clearCharacters) clearedItems.push('character library');
            
            const message = clearedItems.length === 1 ? 
                `✅ ${clearedItems[0]} has been cleared!` :
                `✅ ${clearedItems.join(', ')} have been cleared!`;
            
            alert(`${message}\n\nStarting fresh with a new chapter.`);
        }

        function markAsUnsaved() {
            hasUnsavedChanges = true;
            updateChapterTitleBar();
        }

        function saveCurrentChapter() {
            if (!chapter.storyName || chapter.storyName.trim() === '') {
                alert('Please enter a story name before saving!');
                return;
            }
            if (!chapter.chapterName || chapter.chapterName.trim() === '') {
                alert('Please enter a chapter name before saving!');
                return;
            }
            if (!chapter.fileName || chapter.fileName.trim() === '') {
                alert('Please enter a file name before saving!');
                return;
            }

            if (!currentChapterId) {
                // First time save - generate ID
                currentChapterId = generateChapterId();
            }
            
            saveChapterToStorage(currentChapterId, chapter);
            hasUnsavedChanges = false;
            updateChapterTitleBar();
            alert(`Chapter "${chapter.storyName} / ${chapter.chapterName}" saved successfully!`);
        }

        function updateChapterTitleBar() {
            const titleElement = document.querySelector('.sidebar h2');
            if (titleElement) {
                if (hasUnsavedChanges) {
                    titleElement.textContent = 'Dialogue Nodes *';
                    titleElement.style.color = '#f6ad55';
                } else {
                    titleElement.textContent = 'Dialogue Nodes';
                    titleElement.style.color = '';
                }
            }
        }

        // Legacy function for backward compatibility - now just marks as unsaved
        function autoSaveChapter() {
            markAsUnsaved();
        }

        function loadChapterFromStorage(chapterId) {
            const chapters = getAllChapters();
            if (chapters[chapterId]) {
                return chapters[chapterId].data;
            }
            return null;
        }

        // ============ Chapter Browser ============

        function openChapterBrowser() {
            renderChapterBrowser();
            document.getElementById('chapterBrowserModal').classList.add('active');
        }

        function closeChapterBrowser() {
            document.getElementById('chapterBrowserModal').classList.remove('active');
        }

        function renderChapterBrowser() {
            const list = document.getElementById('chapterBrowserList');
            const chapters = getAllChapters();
            
            list.innerHTML = '';

            // Add "Create New Chapter" card
            const newCard = document.createElement('div');
            newCard.className = 'chapter-card new-chapter-card';
            newCard.innerHTML = `
                <div class="icon">+</div>
                <div style="font-weight: 600;">Create New Chapter</div>
            `;
            newCard.onclick = createNewChapter;
            list.appendChild(newCard);

            // Add existing chapters
            const chapterArray = Object.values(chapters).sort((a, b) => 
                new Date(b.lastModified) - new Date(a.lastModified)
            );

            chapterArray.forEach(chapterInfo => {
                const card = document.createElement('div');
                card.className = 'chapter-card';
                if (chapterInfo.id === currentChapterId) {
                    card.classList.add('active');
                }

                const lastModified = new Date(chapterInfo.lastModified).toLocaleString();
                const nodeCount = chapterInfo.data.nodes.length;

                card.innerHTML = `
                    <div class="chapter-card-header">
                        <div>
                            <div class="chapter-card-title">${chapterInfo.data.storyName || 'StoryName'} / ${chapterInfo.data.chapterName || 'Chapter'}</div>
                            <div class="chapter-card-meta">File: ${chapterInfo.data.fileName || chapterInfo.data.chapterName || 'Chapter_01'}.json</div>
                            <div class="chapter-card-meta">${nodeCount} node(s) | Modified: ${lastModified}</div>
                        </div>
                        <div class="chapter-card-actions">
                            <button onclick="duplicateChapterById('${chapterInfo.id}', event)" title="Duplicate">📋</button>
                            <button onclick="exportChapterById('${chapterInfo.id}', event)" title="Export">💾</button>
                            <button class="delete-chapter" onclick="deleteChapterById('${chapterInfo.id}', event)" title="Delete">🗑️</button>
                        </div>
                    </div>
                `;

                card.onclick = () => loadChapterById(chapterInfo.id);
                list.appendChild(card);
            });
        }

        function createNewChapter() {
            if (hasUnsavedChanges) {
                const shouldSave = confirm('You have unsaved changes. Do you want to save the current chapter before creating a new one?');
                if (shouldSave) {
                    saveCurrentChapter();
                }
            }

            chapter = {
                storyName: "StoryName",
                chapterName: "Chapter",
                fileName: "SO_StoryName_Chapter",
                nextChapter: "",
                nodes: []
            };
            currentChapterId = null; // No ID until saved
            currentNodeIndex = null;
            hasUnsavedChanges = false;
            
            // Reset input fields
            const storyInput = document.getElementById('storyName');
            const chapterInput = document.getElementById('chapterName');
            const fileInput = document.getElementById('fileName');
            const nextChapterInput = document.getElementById('nextChapter');
            const nameBtn = document.getElementById('editNameBtn');
            storyInput.value = chapter.storyName;
            chapterInput.value = chapter.chapterName;
            fileInput.value = chapter.fileName;
            nextChapterInput.value = chapter.nextChapter;
            storyInput.readOnly = true;
            chapterInput.readOnly = true;
            fileInput.readOnly = true;
            nameBtn.textContent = 'Edit';
            nameBtn.className = 'edit-name-btn';
            
            closeEditor();
            renderNodeTable();
            closeChapterBrowser();
            updateChapterTitleBar();
            
            alert('New chapter created! Remember to click "Save Chapter" to save your work.');
        }

        function loadChapterById(chapterId) {
            if (hasUnsavedChanges) {
                const shouldSave = confirm('You have unsaved changes. Do you want to save the current chapter before loading another?');
                if (shouldSave) {
                    saveCurrentChapter();
                }
            }

            const loadedChapter = loadChapterFromStorage(chapterId);
            if (loadedChapter) {
                chapter = loadedChapter;
                
                // Migrate CG fields for older chapters
                if (chapter.nodes) {
                    chapter.nodes = chapter.nodes.map(node => {
                        if (!node.cgAction) {
                            node.cgAction = 'None';
                        }
                        if (!node.cgSprite) {
                            node.cgSprite = '';
                        }
                        return node;
                    });
                }
                
                currentChapterId = chapterId;
                currentNodeIndex = null;
                hasUnsavedChanges = false;
                
                // Reset input fields
                const storyInput = document.getElementById('storyName');
                const chapterInput = document.getElementById('chapterName');
                const fileInput = document.getElementById('fileName');
                const nextChapterInput = document.getElementById('nextChapter');
                const nameBtn = document.getElementById('editNameBtn');
                storyInput.value = chapter.storyName || "StoryName";
                chapterInput.value = chapter.chapterName || "Chapter";
                fileInput.value = chapter.fileName || chapter.chapterName || "Chapter_01";
                nextChapterInput.value = chapter.nextChapter || "";
                storyInput.readOnly = true;
                chapterInput.readOnly = true;
                fileInput.readOnly = true;
                nextChapterInput.readOnly = true;
                nameBtn.textContent = 'Edit';
                nameBtn.className = 'edit-name-btn';
                
                closeEditor();
                renderNodeTable();
                closeChapterBrowser();
                updateChapterTitleBar();
                
                alert(`Chapter "${chapter.storyName} / ${chapter.chapterName || chapter.storyName}" loaded!`);
            } else {
                alert('Error loading chapter!');
            }
        }

        function duplicateChapterById(chapterId, event) {
            event.stopPropagation();
            
            const chapterToDuplicate = loadChapterFromStorage(chapterId);
            if (!chapterToDuplicate) {
                alert('Error loading chapter to duplicate!');
                return;
            }
            
            // Create a deep copy of the chapter
            const duplicatedChapter = JSON.parse(JSON.stringify(chapterToDuplicate));
            
            // Modify the names to indicate it's a copy
            duplicatedChapter.chapterName = duplicatedChapter.chapterName + ' (Copy)';
            duplicatedChapter.fileName = duplicatedChapter.fileName + '_Copy';
            
            // Generate a new ID and save
            const newChapterId = generateChapterId();
            saveChapterToStorage(newChapterId, duplicatedChapter);
            
            // Update the browser display
            renderChapterBrowser();
            
            alert(`Chapter duplicated successfully!\n\nNew chapter: ${duplicatedChapter.storyName} / ${duplicatedChapter.chapterName}`);
        }

        function deleteChapterById(chapterId, event) {
            event.stopPropagation();
            
            const chapters = getAllChapters();
            const chapterData = chapters[chapterId]?.data;
            const displayName = chapterData ? `${chapterData.storyName} / ${chapterData.chapterName || chapterData.storyName}` : 'this chapter';
            
            if (!confirm(`Are you sure you want to delete "${displayName}"? This cannot be undone!`)) {
                return;
            }

            deleteChapterFromStorage(chapterId);
            
            // If we deleted the current chapter, reset to empty state
            if (chapterId === currentChapterId) {
                chapter = {
                    storyName: "StoryName",
                    chapterName: "Chapter",
                    fileName: "SO_StoryName_Chapter",
                    nextChapter: "",
                    nodes: []
                };
                currentChapterId = null;
                currentNodeIndex = null;
                hasUnsavedChanges = false;
                
                document.getElementById('storyName').value = chapter.storyName;
                document.getElementById('chapterName').value = chapter.chapterName;
                document.getElementById('fileName').value = chapter.fileName;
                document.getElementById('nextChapter').value = chapter.nextChapter;
                closeEditor();
                renderNodeTable();
                updateChapterTitleBar();
            }
            
            renderChapterBrowser();
            alert('Chapter deleted!');
        }

        function exportChapterById(chapterId, event) {
            event.stopPropagation();
            
            const chapterToExport = loadChapterFromStorage(chapterId);
            if (chapterToExport) {
                // Collect all background images used in this chapter
                const usedBackgrounds = new Set();
                chapterToExport.nodes.forEach(node => {
                    if (node.backgroundSprite) {
                        usedBackgrounds.add(node.backgroundSprite);
                    }
                });

                // Get cached image data for used backgrounds
                const backgroundImages = {};
                const cache = getBackgroundCache();
                usedBackgrounds.forEach(bgName => {
                    if (cache[bgName]) {
                        backgroundImages[bgName] = cache[bgName].dataUrl;
                    }
                });

                // Create export structure with metadata
                const exportData = {
                    chapter: chapterToExport,
                    metadata: {
                        version: "1.0",
                        exportDate: new Date().toISOString(),
                        backgroundImages: backgroundImages
                    }
                };

                const json = JSON.stringify(exportData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = (chapterToExport.fileName || chapterToExport.chapterName || 'chapter') + '.json';
                a.click();
                URL.revokeObjectURL(url);
            }
        }

        // ============ Keyboard Shortcuts ============
        
        document.addEventListener('keydown', function(e) {
            // ESC to close modals
            if (e.key === 'Escape') {
                // Check lightbox first (highest priority)
                if (document.getElementById('imageLightbox').classList.contains('active')) {
                    closeLightbox(e);
                } else if (document.getElementById('bulkImportModal').classList.contains('active')) {
                    closeBulkImportModal();
                } else if (document.getElementById('characterEditorModal').classList.contains('active')) {
                    closeCharacterEditor();
                } else if (document.getElementById('characterPickerModal').classList.contains('active')) {
                    closeCharacterPicker();
                } else if (document.getElementById('characterLibraryModal').classList.contains('active')) {
                    closeCharacterLibrary();
                } else if (document.getElementById('editorModal').classList.contains('active')) {
                    closeEditor();
                } else if (document.getElementById('choiceModal').classList.contains('active')) {
                    closeChoiceModal();
                } else if (document.getElementById('chapterBrowserModal').classList.contains('active')) {
                    closeChapterBrowser();
                }
            }
        });

        // Click outside modal to close
        document.getElementById('editorModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditor();
            }
        });

        // ============ Initialize ============
        
        // Load character library from localStorage
        loadCharacterLibrary();
        
        // Load last edited chapter or start with empty state
        const allChapters = getAllChapters();
        const chapterIds = Object.keys(allChapters);
        
        if (chapterIds.length > 0) {
            // Load the most recently modified chapter
            const sortedChapters = Object.values(allChapters).sort((a, b) => 
                new Date(b.lastModified) - new Date(a.lastModified)
            );
            currentChapterId = sortedChapters[0].id;
            chapter = sortedChapters[0].data;
            
            // Migrate CG fields for older chapters
            if (chapter.nodes) {
                chapter.nodes = chapter.nodes.map(node => {
                    if (!node.cgAction) {
                        node.cgAction = 'None';
                    }
                    if (!node.cgSprite) {
                        node.cgSprite = '';
                    }
                    return node;
                });
            }
            
            hasUnsavedChanges = false;
        } else {
            // Start with empty chapter (not saved)
            chapter = {
                storyName: "StoryName",
                chapterName: "Chapter",
                fileName: "SO_StoryName_Chapter",
                nodes: []
            };
            currentChapterId = null;
            hasUnsavedChanges = false;
        }

        document.getElementById('storyName').value = chapter.storyName;
        document.getElementById('chapterName').value = chapter.chapterName || "Chapter";
        document.getElementById('fileName').value = chapter.fileName || chapter.chapterName || "Chapter_01";
        document.getElementById('nextChapter').value = chapter.nextChapter || "";
        renderNodeTable();
        updateChapterTitleBar();

        // Warn user about unsaved changes when trying to close the page
        window.addEventListener('beforeunload', function(e) {
            if (hasUnsavedChanges) {
                const message = 'You have unsaved changes. Are you sure you want to leave?';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });