# GetMyTimeBack ⏳

**GetMyTimeBack** is a simple, retro-styled focus timer and work log application designed to help you track your study hours and manage work sessions effectively. 

Built with a unique "Neo-Brutalist" / Retro aesthetic, it makes productivity feel less like a chore and more like a game.

## ✨ Features

*   **Focus Timer**: Customizable "Study" and "Break" intervals.
*   **Activity Logging**: Automatically logs your sessions.
*   **Manual Logging**: Forgot to start the timer? Manually log past sessions.
*   **Statistics Board**: 
    *   Visual Bar Charts for the last 7 days.
    *   Aggregated stats for Day, Week, Month, and Year.
    *   Detailed session history.
*   **Retro Aesthetics**: Custom "Bangers" typography and dynamic favicons.
*   **Internationalization (i18n)**: Supports English, Hindi, Kannada, and Bhojpuri.
*   **Smart Resume**: Paused logs act as "Break" time.
*   **Data Persistence**: Uses `localStorage`.

## 🛠️ Tech Stack

*   **Framework**: React 19 (via ES Modules)
*   **Styling**: Tailwind CSS (CDN)
*   **Build Tooling**: None required (Browser-native ES Modules via `esm.sh`)

## 🚀 How to Run

Since this project uses browser-native ES Modules and CDN imports (via `esm.sh`), you do not need `npm install` or a build step to run it locally.

1.  **Clone or Download** the repository.
2.  **Serve the directory** using any static web server.

### Using Python
```bash
# Run inside the project folder
python3 -m http.server 8000
# Open http://localhost:8000
```

### Using Node.js (npx)
```bash
# Run inside the project folder
npx serve .
# Open the URL provided in the terminal
```

### VS Code
*   Install the "Live Server" extension.
*   Right-click `index.html` and select "Open with Live Server".

*Note: An internet connection is required to load the React and Tailwind dependencies from the CDN.*

## 📂 Project Structure

*   `index.html`: Main entry point.
*   `index.tsx`: React root mounting.
*   `App.tsx`: Main application layout.
*   `components/`: UI components.
*   `contexts/`: Global State (Timer, Logs, Settings).
*   `utils/`: Helper functions.

## 🛡️ Privacy

This application operates entirely client-side. All your logs and settings are stored in your browser's Local Storage.

---

Made with ❤️ by Krishna
