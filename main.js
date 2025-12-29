const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

let mainWindow;

const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false, // Security best practice
            contextIsolation: true, // Security best practice
        },
        autoHideMenuBar: true, // Clean look as requested
        titleBarStyle: 'default', // Or hiddenInset for a cleaner look if we were doing custom titlebar
        backgroundColor: '#1e1e1e', // Dark theme start
    });

    // Load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
const NOTES_DIR = path.join(app.getPath('documents'), 'Notes'); // Store in Documents/Notes

// Ensure directory exists
if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
}

ipcMain.handle('app:get-documents-path', () => {
    return NOTES_DIR;
});

ipcMain.handle('notes:get-all', async () => {
    try {
        const files = await fs.promises.readdir(NOTES_DIR);
        const notes = [];
        for (const file of files) {
            if (path.extname(file) === '.json') {
                const content = await fs.promises.readFile(path.join(NOTES_DIR, file), 'utf-8');
                try {
                    const note = JSON.parse(content);
                    notes.push({ ...note, filename: file });
                } catch (e) {
                    console.error("Error parsing note:", file, e);
                }
            }
        }
        // Sort by updated date desc
        return notes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (error) {
        console.error("Error getting notes:", error);
        return [];
    }
});

ipcMain.handle('notes:save', async (event, note) => {
    try {
        const id = note.id || require('crypto').randomUUID();
        const filename = `${id}.json`;
        const noteData = {
            id,
            title: note.title || 'Untitled Note',
            content: note.content || '',
            updatedAt: Date.now(),
            isLocked: note.isLocked || false,
            isArchived: note.isArchived || false,
            password: note.password || null
        };
        await fs.promises.writeFile(path.join(NOTES_DIR, filename), JSON.stringify(noteData, null, 2));
        return { success: true, note: noteData };
    } catch (error) {
        console.error("Error saving note:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('notes:delete', async (event, noteId) => {
    try {
        const filename = `${noteId}.json`;
        await fs.promises.unlink(path.join(NOTES_DIR, filename));
        return { success: true };
    } catch (error) {
        console.error("Error deleting note:", error);
        return { success: false, error: error.message };
    }
});

// Settings Handlers
ipcMain.handle('settings:get-autolaunch', () => {
    return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('settings:set-autolaunch', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe')
    });
    return app.getLoginItemSettings().openAtLogin;
});
