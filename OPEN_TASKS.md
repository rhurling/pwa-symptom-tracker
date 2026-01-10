# PWA Symptom Tracker - Open Tasks Implementation Plan

This document outlines remaining tasks to complete the PWA Symptom Tracker application based on the comparison between SPEC.md, IMPLEMENTATION_PLAN.md, and the actual implemented code.

**Review Date:** January 2026
**Last Updated:** January 10, 2026
**Review Summary:** Phases A-D are mostly complete. Error handling system, loading states, offline indicator, and accessibility improvements are implemented. 83 unit tests passing. The remaining tasks focus on performance optimization, additional tests, documentation, and deployment.

---

## Implementation Status Summary

### Completed Features
- Project setup (SvelteKit, TypeScript, Tailwind, Vitest, PWA)
- Database layer with Dexie.js (sessions, entries, metrics, settings, reminders tables)
- All TypeScript type definitions
- Svelte stores for settings, sessions, entries, metrics, reminders, connection
- Utility functions (temperature, dates, grouping, errors, accessibility)
- All common UI components (Button, Card, Input, Modal, EmptyState, Spinner, LoadingState, Skeleton, OfflineIndicator)
- All metric input components (Temperature, Feeling, Event, Numeric, Scale)
- Sessions list with SessionCard component
- Session creation with wizard (multi-step flow) and simple form
- Session detail page with status management and trend indicators
- SessionDetail component (extracted to separate file)
- Quick log feature with retrospective entries
- Full timeline view with filters, zoom controls, and collapsible groups
- Timeline components extracted (Timeline, TimelineEntry, TimelineGroup, TimelineFilters)
- Export to Markdown (chronological + sectioned formats, LLM prompts)
- Export service (src/lib/services/export.ts)
- Import service (src/lib/services/import.ts)
- Trend detection service (src/lib/services/trends.ts)
- Notification service (src/lib/services/notifications.ts)
- JSON backup/import with validation
- Settings page (temperature unit, theme, data management)
- Custom metric creator UI (/settings/metrics)
- Notification settings page (/settings/notifications)
- Error handling system (errors.ts)
- Loading states and skeleton loaders
- Offline indicator
- Accessibility improvements (skip links, focus trapping, ARIA labels)
- PWA icons (192x192, 512x512)
- Unit tests (83 tests: dates, temperature, errors, accessibility)
- Empty states for all list views

### Not Implemented / Incomplete
- Smart grouping UI integration in timeline (algorithm implemented)
- Service worker reminder scheduling
- First-launch onboarding flow
- Manual accessibility testing (screen readers)
- Performance optimization
- Additional test coverage (stores, services)

---

## Open Tasks by Priority

### Priority 1: Component Refactoring (Improve Maintainability) ✅ COMPLETED

These components have been extracted for better reusability and testing.

#### 1.1 Timeline Components
**Location:** `src/lib/components/timeline/`

- [x] **Timeline.svelte** - Main timeline container
  - Zoom controls (6h, 24h, 3d, 7d, All)
  - Filter integration
  - Scrollable entry container
  - Props: `entries`, `session`, `onEntryClick`

- [x] **TimelineEntry.svelte** - Entry card display
  - Time display
  - Metric icon and formatted value
  - Threshold warning indicators
  - Notes preview
  - Props: `entry`, `metric`, `temperatureUnit`, `onClick`

- [x] **TimelineGroup.svelte** - Day grouping header
  - Date header with smart formatting
  - Entry count indicator
  - Collapsible state
  - Props: `date`, `entries`, `collapsed`, `onToggle`

- [x] **TimelineFilters.svelte** - Filter component
  - Filter by metric type (checkboxes)
  - Zoom level controls
  - Toggle annotations visibility
  - Props: `metrics`, `selectedMetrics`, `onFilterChange`

#### 1.2 Session Components
**Location:** `src/lib/components/session/`

- [x] **SessionDetail.svelte** - Session detail view with trends
  - Session header with status badge
  - Metric summary cards with latest values
  - Trend indicators (improving/worsening/stable)
  - Props: `session`, `entries`, `metrics`, `temperatureUnit`

- [x] **SessionWizard.svelte** - Multi-step session creation
  - Step 1: Name, description, session type
  - Step 2: Select metrics to track (checklist)
  - Step 3: Configure thresholds (optional)
  - Step 4: Reminder setup
  - Step 5: Review & create
  - Progress indicator
  - Step validation
  - Props: `onComplete`, `onCancel`

---

### Priority 2: Services Layer (Separate Business Logic) ✅ COMPLETED

Services have been extracted for better testing and reusability.

**Location:** `src/lib/services/`

#### 2.1 Export Service
- [x] **export.ts** - Full export functionality
  - `generateMarkdownExport(options: MarkdownExportOptions): string`
  - `generateChronologicalLog(session, entries, options): string`
  - `generateSectionedReport(session, entries, options): string`
  - `generateSummaryStatistics(entries, metrics): SummaryStats`
  - `generateLLMPromptHeader(style: string): string`
  - `downloadAsFile(content: string, filename: string): void`
  - `copyToClipboard(content: string): Promise<boolean>`

#### 2.2 Import Service
- [x] **import.ts** - Full import functionality
  - `validateImportData(data: unknown): ImportValidationResult`
  - `importData(data: ExportData): Promise<ImportResult>`
  - `checkDuplicates(sessions, entries): DuplicateInfo`
  - `importFromFile(file: File, strategy): Promise<ImportResult>`

#### 2.3 Trend Detection Service
- [x] **trends.ts** - Trend detection per spec section 4.3
  - `detectTrend(entries, metricId, windowHours): Trend`
  - `calculateLinearRegressionSlope(values: number[]): number`
  - `getNumericValue(entry: Entry): number`
  - `getTrendLabel(trend: Trend): string`
  - `getTrendIcon(trend: Trend): string`

#### 2.4 Notification Service
- [x] **notifications.ts** - Notification service implementation
  - `requestNotificationPermission(): Promise<NotificationPermission>`
  - `calculateNextReminder(session, recentEntries): Date`
  - `showNotification(title, options): Promise<void>`
  - `sendTestNotification(): Promise<boolean>`
  - `isWithinQuietHours(start, end): boolean`

---

### Priority 3: Smart Features (Spec Sections 4.1-4.3) ✅ MOSTLY COMPLETED

#### 3.1 Smart Timeline Grouping
- [x] Update `src/lib/utils/grouping.ts` with full implementation
  - Complete `determineGrouping()` per spec algorithm
  - `groupEntriesByHour(entries, blockSize)` for 4-hour blocks
  - `groupEntriesByWeek(entries)`
  - `groupEntriesByMonth(entries)`
  - `extractNotableEvents(entries)` - threshold crossings, significant changes
  - `calculateAggregates(entries, type)` - latest, average, minmax, notable
  - `applyGrouping(entries, config)` - helper to apply grouping based on config

- [ ] Integrate smart grouping in Timeline component (UI integration pending)
  - Use session duration to select grouping strategy
  - Render different views based on grouping mode
  - Show aggregates for long-term sessions

#### 3.2 Smart Reminders System
- [x] Create `src/lib/stores/reminders.ts`
  - Reminder CRUD operations
  - Active reminders query
  - Snooze functionality
  - Reminder completion tracking

- [ ] Implement reminder scheduling in service worker (advanced - future)
  - Background reminder calculation
  - Notification triggering
  - Snooze handling

- [x] Update session creation with reminder configuration (via SessionWizard)
  - Smart mode vs scheduled mode selection
  - Metric selection for reminders
  - Interval configuration

#### 3.3 Trend Integration ✅ COMPLETED
- [x] Add trend indicators to SessionDetail
  - Show trend arrow next to each metric
  - Color coding (green improving, amber stable, red worsening)
  - Trend tooltip with details

- [ ] Add trend annotations to Timeline (enhancement - future)
  - Trend markers between entry groups
  - Trend summary per day/period

---

### Priority 4: Configuration Features ✅ COMPLETED

#### 4.1 Custom Metric Creator
**Location:** `/settings/metrics/+page.svelte`

- [x] Create `/settings/metrics/+page.svelte`
  - Metric name input
  - Type selector (Numeric, Scale, Event)
  - Type-specific configuration:
    - **Numeric:** unit, decimal places, valid range
    - **Scale:** min/max values, min/max labels, step
    - **Event:** placeholder text
  - Validation (unique name, valid config)
  - Edit existing custom metrics
  - Delete custom metrics (with warning)

- [x] Add "Manage Custom Metrics" link in Settings
- [x] Session creation shows custom metrics (via metrics store)

#### 4.2 Notification Settings
**Location:** `/settings/notifications/+page.svelte`

- [x] Permission request flow
  - Check current permission state
  - Request button with status feedback
  - Instructions for enabling in browser settings if denied

- [x] Test notification button
  - Send sample notification
  - Verify notification appearance

- [ ] Global notification preferences (enhancement - future)
  - Quiet hours configuration
  - Sound/vibration preferences

---

### Priority 5: Error Handling & Edge Cases ✅ MOSTLY COMPLETED

#### 5.1 Error Handling System ✅ COMPLETED
- [x] Create `src/lib/utils/errors.ts`
  - Define `AppError` class with types from spec
  - `handleStorageError(error): AppError`
  - `handleImportError(error): AppError`
  - `handleExportError(error): AppError`
  - User-friendly message mapping
  - Storage availability checking
  - Storage quota estimation

- [ ] Implement error boundaries in layout (future)
  - Catch unexpected errors gracefully
  - Show recovery options

- [x] Storage quota handling
  - `getStorageEstimate()` - Get current usage
  - `isStorageLow()` - Detect when approaching quota (>80%)
  - `formatBytes()` - Human-readable storage sizes

- [x] Storage unavailable detection
  - `checkStorageAvailability()` - Detect IndexedDB unavailable
  - Informative error messages for private browsing

#### 5.2 Edge Cases & Empty States ✅ MOSTLY COMPLETED
- [ ] First-launch onboarding flow (future enhancement)
  - Welcome screen with privacy notice
  - Quick settings (temperature unit, theme)
  - Prompt to create first session
  - Store "onboarding completed" flag

- [x] Empty states for all list views
  - EmptyState component with icon, title, description, action
  - Sessions list: "No sessions yet"
  - Configurable for all views

- [x] Offline indicator
  - Connection store tracking online/offline state
  - OfflineIndicator component (banner, toast, minimal variants)
  - Shows when offline with reassurance message

- [x] Loading states
  - Spinner component (sm, md, lg, xl sizes)
  - LoadingState component with message
  - Skeleton component (text, circular, rectangular variants)

---

### Priority 6: Accessibility & Polish ✅ PARTIALLY COMPLETED

#### 6.1 Accessibility Audit ✅ MOSTLY COMPLETED
- [x] ARIA labels for all interactive elements
  - All icon buttons have aria-label
  - Interactive cards have role="button" and keyboard support
  - Proper aria-describedby for form fields

- [x] Keyboard navigation
  - Tab order verified across components
  - Focus indicators visible (ring styles)
  - Escape key closes modals
  - Enter/Space activates interactive cards
  - Skip link for main content

- [x] Focus management
  - Focus trap for modals (`createFocusTrap` utility)
  - Focus restored on modal close
  - `getFocusableElements` helper utility

- [x] Accessibility utilities (`src/lib/utils/accessibility.ts`)
  - `announce()` for screen reader announcements
  - `prefersReducedMotion()` helper
  - `generateAriaId()` for unique IDs

- [ ] Screen reader testing (manual verification needed)
  - Test with VoiceOver (iOS/macOS)
  - Test with NVDA/JAWS (Windows)
  - Verify announcements for dynamic content

- [ ] Color contrast verification (manual verification needed)
  - Use automated tools (axe, Lighthouse)
  - Fix any issues below 4.5:1 ratio
  - Check in both light and dark modes

- [ ] Touch target verification (manual verification needed)
  - Ensure all targets >= 44x44px
  - Add padding where needed

- [x] Reduced motion preference
  - `prefersReducedMotion()` utility available
  - Can be integrated with transitions

#### 6.2 Performance Optimization
- [ ] Bundle size audit
  - Target: <50KB JS, <20KB CSS gzipped
  - Tree-shake unused code
  - Lazy load routes

- [ ] IndexedDB query optimization
  - Use indexes effectively
  - Batch reads where possible
  - Cache frequently accessed data

- [ ] Image optimization
  - Compress PWA icons
  - Use appropriate formats

- [ ] Time to interactive testing
  - Measure on throttled 3G
  - Target: <2 seconds

#### 6.3 Visual Polish
- [ ] Transition refinement
  - Smooth page transitions
  - Entry animations
  - Modal open/close animations

- [ ] Empty state improvements
  - Add subtle illustrations or icons
  - Improve messaging

- [ ] App icon finalization
  - Design polished icons
  - Test on various devices

- [ ] Splash screen configuration
  - Configure theme-color
  - Set appropriate background

---

### Priority 7: Testing ✅ PARTIALLY COMPLETED

#### 7.1 Unit Tests
**Existing:** dates.test.ts, temperature.test.ts, errors.test.ts, accessibility.test.ts

- [x] `errors.test.ts` - Error handling utilities (22 tests)
- [x] `accessibility.test.ts` - Accessibility utilities (17 tests)
- [ ] `grouping.test.ts` - Timeline grouping algorithm
- [ ] `stores/sessions.test.ts` - Session store operations
- [ ] `stores/entries.test.ts` - Entry store operations
- [ ] `stores/settings.test.ts` - Settings persistence
- [ ] `services/export.test.ts` - Export format generation
- [ ] `services/trends.test.ts` - Trend detection accuracy

#### 7.2 Component Tests
- [ ] `TemperatureInput.test.ts` - Input, validation, unit toggle
- [ ] `FeelingInput.test.ts` - Emoji selection, note field
- [ ] `ScaleInput.test.ts` - Slider interaction
- [ ] `Modal.test.ts` - Open/close, focus trap
- [ ] `SessionCard.test.ts` - Display, click handling
- [ ] `Timeline.test.ts` - Entry display, grouping

#### 7.3 Integration Tests
- [ ] Session creation flow (new → save → display)
- [ ] Entry logging flow (quick log → save → timeline)
- [ ] Export flow (select session → configure → download)
- [ ] Import flow (upload → validate → merge)
- [ ] Settings persistence (change → reload → verify)

#### 7.4 E2E Tests (Optional - Playwright)
- [ ] First-launch experience
- [ ] Complete session lifecycle
- [ ] Offline functionality
- [ ] PWA installation

---

### Priority 8: Documentation & Deployment

#### 8.1 Documentation
- [ ] Update README.md
  - Project description
  - Setup instructions
  - Development commands
  - Tech stack overview

- [ ] CONTRIBUTING.md (if open source)
  - Code style guide
  - PR process
  - Issue templates

- [ ] CHANGELOG.md
  - Version history
  - Feature additions
  - Bug fixes

#### 8.2 Deployment
- [ ] Configure static adapter (already done in svelte.config.js)
- [ ] Set up hosting (Vercel/Netlify/Cloudflare Pages)
- [ ] Configure CSP headers
- [ ] Set up CI/CD pipeline
  - Run tests on PR
  - Build preview deploys
  - Auto-deploy main branch

---

## Task Count Summary

| Priority | Category | Status |
|----------|----------|--------|
| 1 | Component Refactoring | ✅ COMPLETED |
| 2 | Services Layer | ✅ COMPLETED (4/4 services) |
| 3 | Smart Features | ✅ MOSTLY COMPLETED |
| 4 | Configuration Features | ✅ COMPLETED |
| 5 | Error Handling | ✅ MOSTLY COMPLETED (1 future task) |
| 6 | Accessibility & Polish | ✅ PARTIALLY COMPLETED (manual testing needed) |
| 7 | Testing | ✅ PARTIALLY COMPLETED (4/10+ test files) |
| 8 | Documentation & Deployment | 6 tasks remaining |
| **Total Remaining** | | **~15 tasks** |

---

## Recommended Implementation Order (Updated)

### Phase A: Quick Wins ✅ COMPLETED
1. ~~Extract Timeline components (Priority 1.1)~~ ✅
2. ~~Create export service (Priority 2.1)~~ ✅
3. ~~Add loading states and empty states (Priority 5.2)~~ ✅

### Phase B: Core Improvements ✅ COMPLETED
1. ~~Implement SessionWizard multi-step flow (Priority 1.2)~~ ✅
2. ~~Implement trend detection service (Priority 2.3)~~ ✅
3. ~~Add trend indicators to SessionDetail (Priority 3.3)~~ ✅

### Phase C: Advanced Features ✅ COMPLETED
1. ~~Smart timeline grouping (Priority 3.1)~~ ✅
2. ~~Custom metric creator (Priority 4.1)~~ ✅
3. ~~Notification service and reminders (Priority 2.4, 3.2)~~ ✅

### Phase D: Polish & Testing ✅ MOSTLY COMPLETED
1. ~~Error handling system (Priority 5.1)~~ ✅
2. ~~Loading states and offline indicator (Priority 5.2)~~ ✅
3. ~~Accessibility improvements (Priority 6.1)~~ ✅
4. ~~Unit tests for new utilities (Priority 7.1)~~ ✅

### Phase E: Launch Prep (Next)
1. Performance optimization (Priority 6.2)
2. Remaining unit tests (stores, services)
3. Documentation (Priority 8.1)
4. Deployment setup (Priority 8.2)

---

## Notes

- The MVP is functional and significantly enhanced. Phases A, B, C, and D are now mostly complete.
- Priority 1-5 complete - component refactoring, services, smart features, configuration, and error handling all done.
- Priority 6 (accessibility) implemented - skip links, focus trapping, ARIA labels, keyboard navigation. Manual testing recommended.
- Priority 7 (testing) has 83 passing tests covering dates, temperature, errors, and accessibility utilities.
- Phase E focuses on performance, remaining tests, and deployment preparation.

---

*Open Tasks Version: 1.3*
*Last Updated: January 10, 2026*
