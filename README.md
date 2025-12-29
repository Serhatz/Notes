# Simple Modern Notes App

A fast, modern, and lightweight desktop note-taking application built with Electron. Designed for simplicity and focus, it mimics the feel of a real notebook with a clean 3-column layout.


## Features

-   **3-Column Layout**: Intuitive navigation with Sidebar, Note List, and Editor.
-   **Notebook Feel**: Text area designed with subtle lines and margins for a natural writing experience.
-   **Local Storage**: Your notes are stored locally on your machine for privacy and offline access.
-   **Visual Customization**:
    -   **Multiple Themes**: Dark (Default), Light, Sepia, Midnight, and Forest.
    -   **Dynamic Theming**: Editor paper style adapts to the selected theme.
    -   **Text & Highlight Colors**: Custom pickers for text and highlighter colors.
-   **Organization**:
    -   **Search**: Filter notes instantly by title or content.
    -   **Archive**: Keep your workspace clean by archiving old notes.
-   **Security**:
    -   **Password Protection**: Lock specific notes with a password.
    -   **Auto-Lock**: Content is hidden until unlocked.

## Tech Stack

-   **Framework**: [Electron](https://www.electronjs.org/)
-   **Styling**: SCSS / Sass
-   **Frontend**: Vanilla JavaScript (No heavy frameworks)

## Installation & Development

### Prerequisites

-   Node.js installed.

### Setup

```bash
# Clone the repository
git clone https://github.com/Serhatz/Notes.git
cd Notes

# Install dependencies
npm install
```

### Running Locally

```bash
# Start the application (compiles SCSS automatically)
npm start
```

### Building for Windows

```bash
# Initialize Electron Forge (First time only)
npx electron-forge import

# Create distributable .exe
npm run make
```

---

The code comments and performance optimizations of this project were assisted and refined using artificial intelligence tools to improve readability, maintainability, and overall code quality.