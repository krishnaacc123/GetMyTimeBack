# GetMyTimeBack

A simple, retro-styled focus timer and work log to track your focus hours and manage study sessions for desktop. Start a session, take breaks, and see your activity over time—all in the browser with no account required.

## Features

- **Focus timer** — Set a target duration (default 25 min), start working, and get notified when time’s up.
- **Break mode** — Pause for a break with a separate timer; add +5 minutes if you need more time.
- **Work log** — Sessions and breaks are logged automatically. View and delete entries in the Activity Board.
- **Stats & charts** — See work today, sessions count, and charts by day/week/month (Recharts).
- **Settings** — Configure work and break duration, notifications, and sound. Presets: Pomodoro (25/5), 90-min cycle, short bursts.
- **Light/dark theme** — Toggle theme; preferences persist in `localStorage`.
- **Multi-language** — English, हिंदी (Hindi), ಕನ್ನಡ (Kannada), भोजपुरी (Bhojpuri).
- **Offline-friendly** — Data stored in `localStorage`; no backend or API keys needed to run.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (dev server, build)
- **Tailwind CSS** (via CDN in `index.html`; custom retro theme)
- **Recharts** for stats/charts
- **Vitest** + **Testing Library** (unit tests), **Playwright** (e2e)

## Prerequisites

- **Node.js** (v18+ recommended)

No API keys or environment variables are required for the core app.

## Run Locally

1. **Clone or download** the project and go to its folder:

   ```bash
   cd getmytimeback
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

   The app runs at **http://localhost:3000** (port is set in `vite.config.ts`).

4. **Build for production:**

   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

## Project Structure

```
getmytimeback/
├── App.tsx                 # Main UI: timer, controls, modals
├── index.tsx               # Entry point, context providers
├── index.html              # HTML, meta tags, Tailwind + fonts
├── types.ts                # TimerMode, StudyLog, Settings, etc.
├── constants.ts            # Default durations, localStorage keys
├── components/             # UI components
│   ├── RetroButton.tsx
│   ├── SettingsModal.tsx
│   ├── StatsBoard.tsx     # Activity board, charts, log cards
│   ├── SessionSummaryModal.tsx
│   ├── FeedbackModal.tsx
│   ├── ConfirmationModal.tsx
│   └── Sandglass.tsx
├── contexts/               # React context
│   ├── TimerContext.tsx    # Timer state, study/break flow
│   ├── SettingsContext.tsx
│   ├── LogsContext.tsx     # Study logs, persistence
│   └── LanguageContext.tsx
├── services/
│   ├── notification.ts    # Browser notifications
│   └── sound.ts           # Alarm sound on session end
├── utils/
│   ├── time.ts            # formatTime, formatDuration, date helpers
│   ├── quotes.ts
│   └── translations.ts    # i18n strings
├── __tests__/              # Unit/integration tests (Vitest)
├── e2e/                    # Playwright E2E tests
│   └── critical-flows.spec.ts
└── vite.config.ts
```

## Testing

- **Unit / integration (Vitest):**

  ```bash
  npx vitest
  ```

- **E2E (Playwright):** Start the app (`npm run dev`), then in another terminal:
  ```bash
  npx playwright test
  ```
  E2E tests expect the app at the default base URL (e.g. `http://localhost:3000`). Configure in `playwright.config.ts` if needed.

## Data & Persistence

- **Settings** — `focus-retro-settings` (work/break duration, theme, notifications, sound).
- **Logs** — `focus-retro-logs` (study and break sessions with timestamps and duration).
- **Timer state** — `focus-retro-timer-state` (so you can refresh without losing an active session).

All keys are in `constants.ts`. Data is stored only in the browser; there is no server or cloud sync.

## Feedback

Use the **💬 Feedback** link in the app footer to send feedback via email (opens your mail client).

---

**Made with ❤️ by [Krishna](https://github.com/krishnaacc123)**
