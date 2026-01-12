# Changelog

All notable changes to PWA Symptom Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-12

### Added

#### Core Features
- Session-based symptom tracking with active/paused/resolved states
- Multiple built-in metric types:
  - Temperature (°C/°F with fever detection)
  - Feeling scale (1-5 emoji-based)
  - Event/note logging
- Custom metric creation (numeric, scale, event types)
- Quick log feature for rapid entry logging
- Retrospective entry logging with custom timestamps

#### Timeline & Visualization
- Chronological timeline view with smart grouping
- Grouping algorithms: by hour, day, week, month
- Zoom controls (6h, 24h, 3d, 7d, All)
- Collapsible day groups
- Filter by metric type
- Notable event detection (threshold crossings, significant changes)

#### Trend Detection
- Automatic trend analysis (improving/stable/worsening)
- Linear regression-based slope calculation
- Trend indicators on session detail page
- Per-metric trend visualization

#### Export & Import
- Markdown export formats:
  - Chronological log
  - Sectioned report (tables)
  - Summary statistics
- LLM-ready prompts (general, patterns, treatment analysis)
- JSON backup/restore functionality
- Data validation on import
- Copy to clipboard support

#### User Experience
- Progressive Web App (PWA) with offline support
- Dark/light theme with system preference detection
- Temperature unit preference (Celsius/Fahrenheit)
- Responsive mobile-first design
- Bottom navigation with visual feedback
- Page transitions with fade animations
- Stagger animations for list items
- Floating action button with scale animation

#### Accessibility
- Skip link for keyboard navigation
- Focus trapping in modals
- ARIA labels on interactive elements
- Keyboard navigation support (Enter/Space for cards)
- Screen reader announcements utility
- Reduced motion preference support

#### Error Handling
- Comprehensive error handling system
- Storage quota monitoring
- Offline indicator (toast notification)
- User-friendly error messages
- Storage availability detection

#### Developer Experience
- TypeScript throughout
- 175 unit tests covering:
  - Date/time utilities
  - Temperature conversion
  - Timeline grouping
  - Trend detection
  - Export formatting
  - Accessibility utilities
  - Error handling
- GitHub Actions CI/CD pipelines:
  - CI workflow (type check, tests, lint, build)
  - Deploy workflow (GitHub Pages)
- Comprehensive README documentation
- CHANGELOG version tracking

### Technical Details
- Built with SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS 4 for styling
- Dexie.js for IndexedDB persistence
- Vite PWA plugin for service worker
- Vitest for testing

## [Unreleased]

### Planned
- Service worker reminder scheduling
- First-launch onboarding flow
- Component-level unit tests
- E2E tests with Playwright
- Performance profiling
