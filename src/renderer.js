const noteListContainer = document.getElementById('note-list-container');
const addNoteBtn = document.getElementById('add-note-btn');
const titleInput = document.getElementById('note-title-input');
const editorContent = document.getElementById('editor-content');
const deleteBtn = document.getElementById('delete-btn');
const highlightBtn = document.getElementById('highlight-btn');
const lockBtn = document.getElementById('lock-btn');
const archiveBtn = document.getElementById('archive-btn');
const searchInput = document.querySelector('.search-bar input');

// Modal Elements
const passwordModal = document.getElementById('password-modal');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-password-input');
const modalCancel = document.getElementById('modal-cancel-btn');
const modalConfirm = document.getElementById('modal-confirm-btn');

// Secured Overlay Elements
const lockedOverlay = document.getElementById('locked-overlay');
const unlockInput = document.getElementById('unlock-password-input');
const unlockBtn = document.getElementById('unlock-btn');
const lockedBackBtn = document.getElementById('locked-back-btn');

// Color Pickers
const highlightColorInput = document.getElementById('highlight-color-input');
const textColorInput = document.getElementById('text-color-input');


let notes = [];
let currentNote = null;
let saveTimeout = null;
let currentSection = 'notes'; // notes, locked, archive, settings

// Initial Load
(async () => {
    // Load Settings
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.className = ''; // reset
    if (savedTheme !== 'dark') document.body.classList.add(`${savedTheme}-theme`);

    // Setup Sidebar Navigation
    document.querySelectorAll('.primary-sidebar .menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.primary-sidebar .menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentSection = item.dataset.section;
            deselectNote(); // Clear editor when switching sections
            renderNoteList();
        });
    });

    await loadNotes();
    if (notes.length > 0) {
        selectNote(notes[0]);
    } else {
        createNewNote();
    }
})();

async function loadNotes() {
    notes = await window.api.getNotes();
    renderNoteList();
}

function renderNoteList() {
    noteListContainer.innerHTML = '';

    const query = searchInput.value.toLowerCase();
    const filteredNotes = notes.filter(note => {
        if (currentSection === 'notes') {
            if (note.isArchived || note.isLocked) return false;
        } else if (currentSection === 'locked') {
            if (!note.isLocked) return false;
        } else if (currentSection === 'archive') {
            if (!note.isArchived) return false;
        } else if (currentSection === 'settings') {
            return false;
        }

        // Don't show content preview for locked notes if in search
        const contentMatch = note.isLocked ? false : note.content.toLowerCase().includes(query);
        return (note.title.toLowerCase().includes(query) || contentMatch);
    });

    if (currentSection === 'settings') {
        renderSettings();
        return;
    }

    filteredNotes.forEach(note => {
        const el = document.createElement('div');
        el.className = `note-list-item ${currentNote && currentNote.id === note.id ? 'active' : ''}`;

        let preview = 'Locked Note';
        if (!note.isLocked) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content;
            const plainText = tempDiv.textContent || '';
            preview = plainText.substring(0, 50) || 'No content';
        }

        const dateStr = new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        el.innerHTML = `
            <div class="note-title">${note.title || 'Untitled'}</div>
            <div class="note-preview">${preview}</div>
            <div class="note-date">${dateStr}</div>
        `;

        el.addEventListener('click', () => selectNote(note));
        noteListContainer.appendChild(el);
    });
}

function selectNote(note) {
    currentNote = note;
    titleInput.value = note.title;

    // Check Lock Status
    if (note.isLocked) {
        lockedOverlay.classList.remove('hidden');
        editorContent.innerHTML = ''; // Clear for security
        unlockInput.value = '';

        // Disable editing toolbar
        titleInput.disabled = true;
        editorContent.contentEditable = "false";
    } else {
        lockedOverlay.classList.add('hidden');
        editorContent.innerHTML = note.content;

        titleInput.disabled = false;
        editorContent.contentEditable = "true";
    }

    // Update button states
    lockBtn.style.color = note.isLocked ? 'var(--accent-color)' : '';
    archiveBtn.style.color = note.isArchived ? 'var(--accent-color)' : '';

    // Animate Editor
    editorContent.classList.remove('fade-in');
    void editorContent.offsetWidth; // Trigger reflow
    editorContent.classList.add('fade-in');

    renderNoteList();
}

function deselectNote() {
    currentNote = null;
    titleInput.value = '';
    titleInput.disabled = false; // or remain disabled?
    editorContent.innerHTML = '';
    editorContent.contentEditable = "true"; // allow typing new? Or show "Select a note"?

    // For this app simple approach: clear and maybe show placeholder
    lockedOverlay.classList.add('hidden');
    lockBtn.style.color = '';
    archiveBtn.style.color = '';
    renderNoteList();
}

// -- ACTION HANDLERS --

// Unlock Handler
unlockBtn.addEventListener('click', () => {
    if (!currentNote) return;
    if (unlockInput.value === currentNote.password) {
        // Correct Password
        lockedOverlay.classList.add('hidden');
        editorContent.innerHTML = currentNote.content;

        titleInput.disabled = false;
        editorContent.contentEditable = "true";
    } else {
        alert("Incorrect password!");
        unlockInput.value = '';
        unlockInput.focus();
    }
});

if (lockedBackBtn) {
    lockedBackBtn.addEventListener('click', () => {
        deselectNote();
    });
}

// Lock Toggle Handler
lockBtn.addEventListener('click', () => {
    if (!currentNote) return;

    if (currentNote.isLocked) {
        // Unlocking (Removing protection)
        if (!lockedOverlay.classList.contains('hidden')) return;

        if (confirm("Remove password protection from this note?")) {
            currentNote.isLocked = false;
            currentNote.password = null;
            saveCurrentNote().then(() => {
                selectNote(currentNote);
            });
        }
    } else {
        // Locking (Setting protection)
        showPasswordModal().then(password => {
            if (password) {
                currentNote.isLocked = true;
                currentNote.password = password;
                saveCurrentNote().then(() => {
                    // Deselect note instead of selecting it, so it vanishes/clears
                    deselectNote();
                });
            }
        });
    }
});


// Modal Logic
function showPasswordModal() {
    return new Promise((resolve) => {
        passwordModal.classList.remove('hidden');
        modalInput.value = '';
        modalInput.focus();

        const close = (val) => {
            passwordModal.classList.add('hidden');
            resolve(val);
            cleanup();
        };

        const onConfirm = () => {
            if (modalInput.value.length > 0) close(modalInput.value);
            else alert("Password cannot be empty");
        };

        const onCancel = () => close(null);
        const onKey = (e) => { if (e.key === 'Enter') onConfirm(); };

        modalConfirm.onclick = onConfirm;
        modalCancel.onclick = onCancel;
        modalInput.onkeydown = onKey;

        function cleanup() {
            modalConfirm.onclick = null;
            modalCancel.onclick = null;
            modalInput.onkeydown = null;
        }
    });
}


async function createNewNote() {
    const newNote = {
        title: '',
        content: '',
        isLocked: false,
        isArchived: false,
        password: null
    };
    const result = await window.api.saveNote(newNote);
    if (result.success) {
        if (currentSection !== 'notes') {
            currentSection = 'notes';
            document.querySelectorAll('.primary-sidebar .menu-item').forEach(i => i.classList.remove('active'));
            document.querySelector('[data-section="notes"]').classList.add('active');
        }

        currentNote = result.note;
        await loadNotes();
        selectNote(currentNote);
        titleInput.focus();
    }
}

async function saveCurrentNote() {
    if (!currentNote) return;

    currentNote.title = titleInput.value;
    // Only save content if we are NOT locked (visible)
    if (!currentNote.isLocked || lockedOverlay.classList.contains('hidden') === true) {
        currentNote.content = editorContent.innerHTML;
    }

    const result = await window.api.saveNote(currentNote);
    if (result.success) {
        await loadNotes();
    }
}

function triggerSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveCurrentNote, 1000);
}

// Events
addNoteBtn.addEventListener('click', createNewNote);
titleInput.addEventListener('input', triggerSave);
editorContent.addEventListener('input', triggerSave);
searchInput.addEventListener('input', renderNoteList);

deleteBtn.addEventListener('click', async () => {
    if (!currentNote) return;

    if (currentNote.isLocked && !lockedOverlay.classList.contains('hidden')) {
        alert("Unlock note before deleting.");
        return;
    }

    if (confirm('Are you sure you want to delete this note?')) {
        await window.api.deleteNote(currentNote.id);
        deselectNote();
        await loadNotes();

        // Auto select first visible?
        const visibleNotes = notes.filter(n => !n.isArchived && !n.isLocked);
        if (visibleNotes.length > 0) selectNote(visibleNotes[0]);
    }
});

archiveBtn.addEventListener('click', () => {
    if (!currentNote) return;
    currentNote.isArchived = !currentNote.isArchived;

    const wasArchived = currentNote.isArchived;

    saveCurrentNote().then(() => {
        if (wasArchived) {
            // Switch to Archive section
            currentSection = 'archive';
            document.querySelectorAll('.primary-sidebar .menu-item').forEach(i => i.classList.remove('active'));
            document.querySelector('[data-section="archive"]').classList.add('active');
            renderNoteList();
            // And stay selected? Or re-select to update UI?
            selectNote(currentNote);
        } else {
            // Unarchived
            // Switch to Notes section?
            if (currentSection === 'archive') {
                currentSection = 'notes';
                document.querySelectorAll('.primary-sidebar .menu-item').forEach(i => i.classList.remove('active'));
                document.querySelector('[data-section="notes"]').classList.add('active');
                renderNoteList();
                selectNote(currentNote);
            } else {
                selectNote(currentNote);
            }
        }
    });
});

highlightBtn.addEventListener('click', () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'highlight';

    // Apply selected color
    if (highlightColorInput) {
        span.style.backgroundColor = highlightColorInput.value;
    }

    try {
        range.surroundContents(span);
        triggerSave();
    } catch (e) { console.error(e); }
});

if (textColorInput) {
    textColorInput.addEventListener('input', () => {
        // We use execCommand for text color as it's cleaner for simple text editors than wrapping manually
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('foreColor', false, textColorInput.value);
        triggerSave();
    });
}

async function renderSettings() {
    const isAutoLaunch = await window.api.getAutoLaunch();
    noteListContainer.innerHTML = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px; color: var(--text-primary);">Settings</h3>
            
            <div style="margin-bottom: 20px;">
                <label style="display:block; margin-bottom: 8px; color: var(--text-secondary);">Theme</label>
                <select id="theme-select" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);">
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="sepia">Sepia</option>
                    <option value="midnight">Midnight</option>
                    <option value="forest">Forest</option>
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display:flex; align-items: center; color: var(--text-primary); cursor: pointer;">
                    <input type="checkbox" id="autolaunch-check" ${isAutoLaunch ? 'checked' : ''} style="margin-right: 10px;">
                    Open on Startup
                </label>
            </div>
        </div>
    `;

    // Bind Events
    const themeSelect = document.getElementById('theme-select');
    themeSelect.value = localStorage.getItem('theme') || 'dark';

    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        localStorage.setItem('theme', theme);

        document.body.className = ''; // Remove all
        if (theme !== 'dark') {
            document.body.classList.add(`${theme}-theme`);
        }
    });

    document.getElementById('autolaunch-check').addEventListener('change', async (e) => {
        await window.api.setAutoLaunch(e.target.checked);
    });
}
