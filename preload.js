const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getDocumentsPath: () => ipcRenderer.invoke('app:get-documents-path'),
    getNotes: () => ipcRenderer.invoke('notes:get-all'),
    saveNote: (note) => ipcRenderer.invoke('notes:save', note),
    deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
    getAutoLaunch: () => ipcRenderer.invoke('settings:get-autolaunch'),
    setAutoLaunch: (enable) => ipcRenderer.invoke('settings:set-autolaunch', enable),
});
