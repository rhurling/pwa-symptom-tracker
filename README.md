# PWA Symptom Tracker

A privacy-first Progressive Web App for tracking health symptoms. All data is stored locally on your device using IndexedDB - nothing is sent to external servers.

## Features

- **Session-based tracking**: Create symptom sessions for different illnesses or health events
- **Multiple metric types**: Temperature, feeling scale, events, custom numeric/scale metrics
- **Timeline view**: Visualize your symptoms chronologically with smart grouping
- **Trend detection**: Automatic detection of improving, stable, or worsening trends
- **Export options**: Export to Markdown (chronological, sectioned, or summary formats) or JSON backup
- **LLM-ready exports**: Include AI-friendly prompts for pattern analysis
- **Offline support**: Full PWA with offline functionality
- **Dark mode**: System-aware theme with manual override option
- **Accessibility**: Skip links, focus trapping, keyboard navigation, ARIA labels

## Tech Stack

- **Framework**: [SvelteKit 2](https://kit.svelte.dev/) with [Svelte 5](https://svelte.dev/) runes
- **Language**: TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **PWA**: [@vite-pwa/sveltekit](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html)
- **Testing**: [Vitest](https://vitest.dev/)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/rhurling/pwa-symptom-tracker.git
cd pwa-symptom-tracker

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev        # Start dev server at http://localhost:5173

# Building
npm run build      # Build for production
npm run preview    # Preview production build

# Testing
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once

# Code Quality
npm run check      # TypeScript and Svelte checks
npm run lint       # ESLint
npm run format     # Prettier formatting
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── common/       # Button, Card, Modal, Input, etc.
│   │   ├── metrics/      # Temperature, Feeling, Scale, etc.
│   │   ├── session/      # SessionCard, SessionDetail, SessionWizard
│   │   └── timeline/     # Timeline, TimelineEntry, TimelineGroup
│   ├── db/               # Dexie database configuration
│   ├── services/         # Export, Import, Trends, Notifications
│   ├── stores/           # Svelte stores for state management
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions (dates, temperature, etc.)
├── routes/
│   ├── +layout.svelte    # App layout with navigation
│   ├── +page.svelte      # Home page (sessions list)
│   ├── export/           # Export page
│   ├── session/          # Session detail and quick log pages
│   └── settings/         # Settings, metrics, notifications pages
└── app.css               # Global styles with Tailwind
```

## Usage

### Creating a Session

1. Click "+" on the home page
2. Enter session name and optional description
3. Select metrics to track (temperature, feeling, or custom)
4. Optionally configure reminders
5. Start tracking!

### Logging Entries

- **Quick Log**: Tap a session card to open quick log drawer
- **Detailed Entry**: Use the session detail page for full entry form
- **Retrospective**: Log past entries with custom timestamps

### Exporting Data

1. Go to Export page
2. Select a session
3. Choose format (Markdown chronological/sectioned/summary)
4. Toggle notes and annotations
5. Optionally include LLM analysis prompts
6. Copy to clipboard or download as file

### Backup & Restore

- **Export**: Settings > Data Management > Export All Data (JSON)
- **Import**: Settings > Data Management > Import Data

## Privacy

This app prioritizes your privacy:

- **Local storage only**: All data is stored in your browser's IndexedDB
- **No tracking**: No analytics, no cookies, no external requests
- **No accounts**: No sign-up required
- **Your data, your control**: Export or delete your data anytime

## Testing

The project has comprehensive unit tests covering:

- Date/time utilities
- Temperature conversion and formatting
- Timeline grouping algorithms
- Trend detection
- Export format generation
- Accessibility utilities
- Error handling

Run tests with:
```bash
npm run test
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT
