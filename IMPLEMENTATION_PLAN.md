# PWA Symptom Tracker - Implementation Plan

This document outlines the phased implementation plan for the PWA Symptom Tracker application based on the technical specification in SPEC.md.

---

## Technology Stack (Based on Spec Recommendations)

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | SvelteKit | Small bundle, excellent PWA support |
| Storage | Dexie.js | IndexedDB wrapper with TypeScript support |
| State | Svelte stores | Framework native |
| CSS | Tailwind CSS | Rapid development, easy theming |
| PWA | vite-plugin-pwa | Zero-config service worker |
| Testing | Vitest + Testing Library | Fast, framework-agnostic |
| Date handling | date-fns | Tree-shakeable, immutable |

---

## Phase 1: Project Foundation ✅

### 1.1 Project Setup
- [x] Initialize SvelteKit project with TypeScript
- [x] Configure Tailwind CSS with custom color system from spec (sage greens, warm grays)
- [x] Set up Vitest for unit testing
- [x] Configure ESLint and Prettier
- [x] Set up path aliases (@lib, @components, etc.)

### 1.2 PWA Configuration
- [x] Install and configure vite-plugin-pwa
- [x] Create web app manifest (manifest.json) with app metadata
- [x] Set up service worker with cache-first strategy for app shell
- [ ] Create placeholder icons (192x192, 512x512)
- [x] Configure offline fallback page

### 1.3 TypeScript Types
- [x] Create `src/lib/types/index.ts` with all interfaces from spec:
  - UserSettings
  - TrackingSession, MetricConfig, ThresholdConfig
  - MetricDefinition and all config types (Temperature, Feeling, Event, Numeric, Scale)
  - Entry and all value types
  - ReminderConfig
  - Export/Import types
  - Error types

### 1.4 Database Layer
- [x] Install Dexie.js
- [x] Create `src/lib/db/schema.ts` with database schema
- [x] Create `src/lib/db/database.ts` with Dexie instance and indexes
- [x] Implement `src/lib/db/migrations.ts` for future schema updates
- [x] Seed built-in metrics (Temperature, Feeling, Event)

---

## Phase 2: Core Data Layer & State Management ✅

### 2.1 Svelte Stores
- [x] Create `src/lib/stores/settings.ts`
  - Initialize with defaults
  - Persist to IndexedDB
  - Handle temperature unit conversion
  - Handle theme preference
- [x] Create `src/lib/stores/sessions.ts`
  - CRUD operations for sessions
  - Active session selection
  - Session filtering by status
- [x] Create `src/lib/stores/entries.ts`
  - CRUD operations for entries
  - Queries by session, metric, date range
  - Reactive entry lists
- [x] Create `src/lib/stores/metrics.ts`
  - Built-in metrics management
  - Custom metrics CRUD

### 2.2 Utility Functions
- [x] Create `src/lib/utils/temperature.ts`
  - Celsius/Fahrenheit conversion
  - Temperature validation
  - Threshold checking
- [x] Create `src/lib/utils/dates.ts`
  - Date formatting helpers
  - Time-ago calculations
  - Date range utilities
- [x] Create `src/lib/utils/grouping.ts`
  - Timeline auto-grouping algorithm (from spec section 4.1)
  - Entry aggregation functions

---

## Phase 3: UI Foundation ✅

### 3.1 Layout & Navigation
- [x] Create `src/routes/+layout.svelte`
  - Header with app title and settings icon
  - Bottom navigation bar (Sessions, Quick Log, Timeline, Export)
  - Theme support (light/dark/system)
- [x] Implement responsive container styles
- [x] Set up route structure per spec file structure

### 3.2 Common Components
- [x] `src/lib/components/common/Button.svelte`
  - Primary, secondary, ghost variants
  - Icon button support
  - Loading state
- [x] `src/lib/components/common/Card.svelte`
  - Session card styling
  - Summary card styling
- [x] `src/lib/components/common/Modal.svelte`
  - Accessible modal with focus trap
  - Close on escape/backdrop click
- [x] `src/lib/components/common/Input.svelte`
  - Text, number, datetime inputs
  - Error states
  - Label and helper text

### 3.3 Theme System
- [x] Implement CSS custom properties from spec section 8
- [x] Light theme variables
- [x] Dark theme variables
- [x] System preference detection
- [x] Theme toggle persistence

---

## Phase 4: Metric Input Components ✅

### 4.1 Temperature Input
- [x] Create `src/lib/components/metrics/TemperatureInput.svelte`
  - Numeric input with increment/decrement buttons
  - Unit display (C/F based on settings)
  - Valid range validation (34-43°C)
  - Threshold warning indicators
  - Large touch targets

### 4.2 Feeling Input
- [x] Create `src/lib/components/metrics/FeelingInput.svelte`
  - Emoji selector row (5 options)
  - Large 44x44px touch targets
  - Visual selection feedback
  - Optional note field
  - Accessibility labels for screen readers

### 4.3 Event Input
- [x] Create `src/lib/components/metrics/EventInput.svelte`
  - Freeform text input
  - Placeholder text
  - Character limit indication

### 4.4 Numeric Input
- [x] Create `src/lib/components/metrics/NumericInput.svelte`
  - Configurable decimal places
  - Unit display
  - Optional min/max validation
  - Increment/decrement buttons

### 4.5 Scale Input
- [x] Create `src/lib/components/metrics/ScaleInput.svelte`
  - Slider or segmented control
  - Min/max labels
  - Step configuration
  - Current value display

---

## Phase 5: Session Management ✅

### 5.1 Sessions List (Home)
- [x] Create `src/routes/+page.svelte`
  - List of session cards
  - Status badges (Active/Resolved/Paused)
  - Session type indicators
  - Last entry timestamp
  - Quick stats (day count, entry count)
- [x] Create `src/lib/components/session/SessionCard.svelte`
  - Swipe actions placeholder (archive, delete)
  - Navigation to session detail
- [x] Floating action button for new session

### 5.2 Session Detail
- [x] Create `src/routes/session/[id]/+page.svelte`
  - Session header with name, description, status
  - Quick action buttons (Quick Log, Edit, Timeline)
  - Recent entries list (last 5-10)
  - Summary cards with trend indicators
- [ ] Create `src/lib/components/session/SessionDetail.svelte`
  - Trend calculation (improving/worsening/stable)
  - Current values display

### 5.3 New Session Wizard
- [x] Create `src/routes/session/new/+page.svelte` (basic version)
- [ ] Create `src/lib/components/session/SessionWizard.svelte`
  - Step 1: Basics (name, description, type)
  - Step 2: Select Metrics (checklist with previews)
  - Step 3: Configure Thresholds (optional)
  - Step 4: Set Up Reminders
  - Step 5: Review & Create
- [ ] Step navigation with progress indicator
- [ ] Validation per step

---

## Phase 6: Quick Log Feature ✅

### 6.1 Quick Log Screen
- [x] Create `src/routes/session/[id]/log/+page.svelte`
  - Time selector (defaults to "Now", allows backdating)
  - Dynamic metric inputs based on session config
  - Optional note field per metric
  - Single save action for all metrics
- [x] Implement retrospective entry flagging
- [x] Success confirmation with navigation options

### 6.2 Entry Management
- [x] Create entry detail/edit modal
- [x] Entry deletion with confirmation
- [ ] Edit timestamp functionality

---

## Phase 7: Timeline View (Partial) ✅

### 7.1 Timeline Component
- [x] Create `src/routes/session/[id]/timeline/+page.svelte`
- [ ] Create `src/lib/components/timeline/Timeline.svelte`
  - Zoom controls (6h, 24h, 3d, 7d, All)
  - Filter dropdown
  - Scrollable entry list

### 7.2 Timeline Entries
- [x] Create `src/lib/components/timeline/TimelineEntry.svelte` (inline in page)
  - Time display
  - Metric icon and value
  - Threshold indicators (warning/critical)
  - Notes display
  - Tap to view/edit
- [x] Create `src/lib/components/timeline/TimelineGroup.svelte` (inline in page)
  - Date headers
  - Collapsible groups for long sessions
  - Aggregate displays

### 7.3 Smart Grouping
- [ ] Implement `determineGrouping()` function from spec
- [ ] Auto-grouping based on session duration
- [ ] Entry aggregation (latest, average, min/max)
- [ ] Notable event extraction

### 7.4 Timeline Filters
- [ ] Create `src/lib/components/timeline/TimelineFilters.svelte`
  - Filter by metric type
  - Filter by date range
  - Toggle annotations

---

## Phase 8: Export Functionality ✅

### 8.1 Export Screen
- [x] Create `src/routes/export/+page.svelte`
  - Session selector
  - Date range picker
  - Format options (chronological, sectioned, summary)
  - Include options (metrics, notes, annotations, raw data)
  - LLM prompt options

### 8.2 Export Service
- [x] Create `src/lib/services/export.ts` (inline in page)
  - Implement `MarkdownExportOptions` interface
  - Chronological log format generator
  - Sectioned report format generator
  - Summary statistics generator
  - LLM prompt header generators

### 8.3 Export Actions
- [x] Markdown preview modal
- [x] Copy to clipboard functionality
- [x] Download as .md file
- [ ] Native share API integration (if available)

### 8.4 JSON Export/Import
- [x] Full data export to JSON
- [x] Import validation (structure, version, integrity)
- [x] Duplicate handling
- [x] Import result reporting

---

## Phase 9: Settings & Configuration (Partial) ✅

### 9.1 Settings Screen
- [x] Create `src/routes/settings/+page.svelte`
  - Temperature unit selector
  - Theme toggle (Light/Dark/System)
  - Data export/import buttons
  - Custom metrics management link
  - Notification settings link
  - Privacy notice display
  - Version info

### 9.2 Custom Metric Creator
- [ ] Create custom metric modal/page
  - Name input
  - Type selector (Number, Scale, Event)
  - Type-specific configuration
  - Validation and preview

### 9.3 Notification Settings
- [ ] Create notification settings page
  - Permission request flow
  - Test notification button
  - Global enable/disable

---

## Phase 10: Smart Features

### 10.1 Trend Detection
- [ ] Create `src/lib/services/trends.ts`
  - Implement `detectTrend()` function from spec
  - Linear regression slope calculation
  - Metric-specific trend interpretation
  - Trend caching for performance

### 10.2 Smart Reminders
- [ ] Create `src/lib/services/notifications.ts`
  - Permission request handling
  - `calculateNextReminder()` implementation
  - Severity-based interval adjustment
  - Reminder scheduling with service worker
- [ ] Create `src/lib/stores/reminders.ts`
  - Scheduled reminders management
  - Snooze functionality

---

## Phase 11: Error Handling & Edge Cases

### 11.1 Error Handling
- [ ] Implement error types from spec
- [ ] Storage quota exceeded handling
- [ ] Storage unavailable fallback
- [ ] Import error handling with user-friendly messages
- [ ] Data corruption detection and recovery

### 11.2 Edge Cases
- [ ] Empty states for all list views
- [ ] First-launch onboarding flow
- [ ] Offline indicator
- [ ] Loading states for async operations

---

## Phase 12: Accessibility & Polish

### 12.1 Accessibility Audit
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Color contrast verification (4.5:1 minimum)
- [ ] Touch target verification (44x44px minimum)
- [ ] Reduced motion preference support

### 12.2 Performance Optimization
- [ ] Bundle size audit (target: <50KB JS, <20KB CSS)
- [ ] Lazy loading for routes
- [ ] Image optimization
- [ ] IndexedDB query optimization
- [ ] Time to interactive testing (<2s on 3G)

### 12.3 Final Polish
- [ ] Transition and animation refinement
- [ ] Error message copy review
- [ ] Empty state illustrations/messages
- [ ] App icon finalization
- [ ] Splash screen configuration

---

## Phase 13: Testing (Partial) ✅

### 13.1 Unit Tests
- [ ] Database layer tests
- [ ] Store tests
- [x] Utility function tests (temperature.ts, dates.ts)
- [ ] Trend detection tests
- [ ] Grouping algorithm tests
- [ ] Export format tests

### 13.2 Component Tests
- [ ] Metric input component tests
- [ ] Timeline component tests
- [ ] Session wizard tests
- [ ] Modal behavior tests

### 13.3 Integration Tests
- [ ] Session creation flow
- [ ] Entry logging flow
- [ ] Export flow
- [ ] Import flow
- [ ] Settings persistence

### 13.4 E2E Tests
- [ ] First-launch experience
- [ ] Complete session lifecycle
- [ ] Offline functionality
- [ ] PWA installation

---

## Phase 14: Documentation & Deployment

### 14.1 Documentation
- [ ] Update README with setup instructions
- [ ] API documentation for stores/services
- [ ] Contributing guidelines
- [ ] Changelog

### 14.2 Deployment
- [ ] Configure static adapter for SvelteKit
- [ ] Set up hosting (Vercel/Netlify/Cloudflare Pages)
- [ ] Configure custom domain (if applicable)
- [ ] Set up CI/CD pipeline
- [ ] Configure CSP headers

---

## Implementation Priority

### MVP (Minimum Viable Product)
1. Phase 1: Project Foundation
2. Phase 2: Core Data Layer
3. Phase 3: UI Foundation (basic)
4. Phase 4: Temperature & Feeling inputs only
5. Phase 5: Sessions List & Detail (basic)
6. Phase 6: Quick Log
7. Phase 7: Timeline (basic, no smart grouping)

### Post-MVP
1. Complete Phase 4 (all metric inputs)
2. Phase 5.3: Session Wizard
3. Phase 7.3: Smart Grouping
4. Phase 8: Export Functionality
5. Phase 9: Settings
6. Phase 10: Smart Features
7. Phases 11-14: Polish & Testing

---

## File Structure Reference

```
pwa-symptom-tracker/
├── public/
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── notification-icon.png
│   └── manifest.json
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   ├── Modal.svelte
│   │   │   │   └── Input.svelte
│   │   │   ├── metrics/
│   │   │   │   ├── TemperatureInput.svelte
│   │   │   │   ├── FeelingInput.svelte
│   │   │   │   ├── EventInput.svelte
│   │   │   │   ├── NumericInput.svelte
│   │   │   │   └── ScaleInput.svelte
│   │   │   ├── timeline/
│   │   │   │   ├── Timeline.svelte
│   │   │   │   ├── TimelineEntry.svelte
│   │   │   │   ├── TimelineGroup.svelte
│   │   │   │   └── TimelineFilters.svelte
│   │   │   └── session/
│   │   │       ├── SessionCard.svelte
│   │   │       ├── SessionWizard.svelte
│   │   │       └── SessionDetail.svelte
│   │   ├── stores/
│   │   │   ├── settings.ts
│   │   │   ├── sessions.ts
│   │   │   ├── entries.ts
│   │   │   ├── metrics.ts
│   │   │   └── reminders.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── database.ts
│   │   │   └── migrations.ts
│   │   ├── services/
│   │   │   ├── notifications.ts
│   │   │   ├── export.ts
│   │   │   ├── import.ts
│   │   │   └── trends.ts
│   │   ├── utils/
│   │   │   ├── temperature.ts
│   │   │   ├── dates.ts
│   │   │   └── grouping.ts
│   │   └── types/
│   │       └── index.ts
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── +layout.svelte
│   │   ├── session/
│   │   │   ├── new/
│   │   │   │   └── +page.svelte
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── log/
│   │   │       │   └── +page.svelte
│   │   │       └── timeline/
│   │   │           └── +page.svelte
│   │   ├── export/
│   │   │   └── +page.svelte
│   │   └── settings/
│   │       └── +page.svelte
│   ├── app.css
│   └── app.html
├── tests/
│   ├── unit/
│   └── e2e/
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## Notes

- All data stays on-device (IndexedDB) - no backend required
- PWA allows offline usage after initial load
- Target bundle size: <50KB JS, <20KB CSS (gzipped)
- Browser support: Last 2 versions of major browsers, iOS Safari 15+, Chrome Android 90+
- WCAG 2.1 AA accessibility compliance target

---

*Plan Version: 1.0*
*Created: January 2026*
