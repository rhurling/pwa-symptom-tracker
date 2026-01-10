# PWA Symptom Tracker - Open Tasks Implementation Plan

This document outlines remaining tasks to complete the PWA Symptom Tracker application based on the comparison between SPEC.md, IMPLEMENTATION_PLAN.md, and the actual implemented code.

**Review Date:** January 2026
**Review Summary:** The MVP functionality is implemented. Core session management, quick logging, timeline view, and export features work. The remaining tasks focus on refactoring, advanced features, polish, and testing.

---

## Implementation Status Summary

### Completed Features
- Project setup (SvelteKit, TypeScript, Tailwind, Vitest, PWA)
- Database layer with Dexie.js (sessions, entries, metrics, settings, reminders tables)
- All TypeScript type definitions
- Svelte stores for settings, sessions, entries, metrics
- Utility functions (temperature, dates, grouping)
- All common UI components (Button, Card, Input, Modal)
- All metric input components (Temperature, Feeling, Event, Numeric, Scale)
- Sessions list with SessionCard component
- Session creation (basic form, not wizard)
- Session detail page with status management
- Quick log feature with retrospective entries
- Basic timeline view (grouped by day)
- Export to Markdown (chronological + sectioned formats, LLM prompts)
- JSON backup/import with validation
- Settings page (temperature unit, theme, data management)
- PWA icons (192x192, 512x512)
- Unit tests for dates.ts and temperature.ts

### Not Implemented / Incomplete
- Refactored timeline components (as separate files)
- Session wizard (multi-step creation flow)
- SessionDetail component (as separate file)
- Smart grouping algorithm in timeline
- Timeline filters component
- Custom metric creator UI
- Smart reminders system
- Trend detection service
- Notification service
- Error handling system
- First-launch onboarding flow
- Accessibility audit & fixes
- Performance optimization
- Full test coverage

---

## Open Tasks by Priority

### Priority 1: Component Refactoring (Improve Maintainability)

These components exist inline in pages but should be extracted for better reusability and testing.

#### 1.1 Timeline Components
**Location:** `src/lib/components/timeline/`

- [ ] **Timeline.svelte** - Extract from `session/[id]/timeline/+page.svelte`
  - Zoom controls (6h, 24h, 3d, 7d, All)
  - Filter integration
  - Scrollable entry container
  - Props: `entries`, `session`, `onEntryClick`

- [ ] **TimelineEntry.svelte** - Extract entry card display
  - Time display
  - Metric icon and formatted value
  - Threshold warning indicators
  - Notes preview
  - Props: `entry`, `metric`, `temperatureUnit`, `onClick`

- [ ] **TimelineGroup.svelte** - Extract day grouping header
  - Date header with smart formatting
  - Entry count indicator
  - Collapsible state
  - Props: `date`, `entries`, `collapsed`, `onToggle`

- [ ] **TimelineFilters.svelte** - New component
  - Filter by metric type (checkboxes)
  - Date range picker integration
  - Toggle annotations visibility
  - Props: `metrics`, `selectedMetrics`, `onFilterChange`

#### 1.2 Session Components
**Location:** `src/lib/components/session/`

- [ ] **SessionDetail.svelte** - Extract from `session/[id]/+page.svelte`
  - Session header with status badge
  - Metric summary cards with latest values
  - Trend indicators (improving/worsening/stable)
  - Props: `session`, `entries`, `metrics`, `temperatureUnit`

- [ ] **SessionWizard.svelte** - Multi-step session creation
  - Step 1: Name, description, session type
  - Step 2: Select metrics to track (checklist)
  - Step 3: Configure thresholds (optional)
  - Step 4: Reminder setup
  - Step 5: Review & create
  - Progress indicator
  - Step validation
  - Props: `onComplete`, `onCancel`

---

### Priority 2: Services Layer (Separate Business Logic)

Extract services from inline page code for better testing and reusability.

**Location:** `src/lib/services/`

#### 2.1 Export Service
- [ ] **export.ts** - Extract from export/+page.svelte
  - `generateMarkdownExport(options: MarkdownExportOptions): string`
  - `generateChronologicalLog(session, entries, options): string`
  - `generateSectionedReport(session, entries, options): string`
  - `generateSummaryStatistics(entries, metrics): SummaryStats`
  - `generateLLMPromptHeader(style: string): string`
  - `downloadAsFile(content: string, filename: string): void`
  - `copyToClipboard(content: string): Promise<boolean>`

#### 2.2 Import Service
- [ ] **import.ts** - Extract from settings/+page.svelte
  - `validateImportData(data: unknown): ImportValidationResult`
  - `importData(data: ExportData): Promise<ImportResult>`
  - `checkDuplicates(sessions, entries): DuplicateInfo`
  - `mergeImportedData(existing, imported, strategy): MergedData`

#### 2.3 Trend Detection Service
- [ ] **trends.ts** - New implementation per spec section 4.3
  - `detectTrend(entries, metricId, windowHours): Trend`
  - `calculateLinearRegressionSlope(values: number[]): number`
  - `getNumericValue(entry: Entry): number`
  - `getTrendLabel(trend: Trend): string`
  - `getTrendIcon(trend: Trend): string`

#### 2.4 Notification Service
- [ ] **notifications.ts** - New implementation per spec section 4.2
  - `requestNotificationPermission(): Promise<NotificationPermission>`
  - `scheduleReminder(session, config): Promise<void>`
  - `cancelReminder(reminderId): Promise<void>`
  - `calculateNextReminder(session, recentEntries): Date`
  - `showNotification(title, options): Promise<void>`
  - `handleNotificationAction(action): void`

---

### Priority 3: Smart Features (Spec Sections 4.1-4.3)

#### 3.1 Smart Timeline Grouping
- [ ] Update `src/lib/utils/grouping.ts` with full implementation
  - Complete `determineGrouping()` per spec algorithm
  - `groupEntriesByHour(entries, blockSize)` for 4-hour blocks
  - `groupEntriesByWeek(entries)`
  - `groupEntriesByMonth(entries)`
  - `extractNotableEvents(entries)` - threshold crossings, significant changes
  - `calculateAggregates(entries, type)` - latest, average, minmax, notable

- [ ] Integrate smart grouping in Timeline component
  - Use session duration to select grouping strategy
  - Render different views based on grouping mode
  - Show aggregates for long-term sessions

#### 3.2 Smart Reminders System
- [ ] Create `src/lib/stores/reminders.ts`
  - Reminder CRUD operations
  - Active reminders query
  - Snooze functionality
  - Reminder completion tracking

- [ ] Implement reminder scheduling in service worker
  - Background reminder calculation
  - Notification triggering
  - Snooze handling

- [ ] Update session creation with reminder configuration
  - Smart mode vs scheduled mode selection
  - Metric selection for reminders
  - Interval configuration

#### 3.3 Trend Integration
- [ ] Add trend indicators to SessionDetail
  - Show trend arrow next to each metric
  - Color coding (green improving, amber stable, red worsening)
  - Trend tooltip with details

- [ ] Add trend annotations to Timeline
  - Trend markers between entry groups
  - Trend summary per day/period

---

### Priority 4: Configuration Features

#### 4.1 Custom Metric Creator
**Location:** New modal or page

- [ ] Create `CustomMetricModal.svelte` or `/settings/metrics/+page.svelte`
  - Metric name input
  - Type selector (Numeric, Scale, Event)
  - Type-specific configuration:
    - **Numeric:** unit, decimal places, valid range
    - **Scale:** min/max values, min/max labels, step
    - **Event:** placeholder text
  - Live preview of input component
  - Validation (unique name, valid config)
  - Edit existing custom metrics
  - Delete custom metrics (with warning if in use)

- [ ] Add "Manage Custom Metrics" link in Settings
- [ ] Update session creation to show custom metrics

#### 4.2 Notification Settings
**Location:** `/settings/notifications/+page.svelte` or section in settings

- [ ] Permission request flow
  - Check current permission state
  - Request button with status feedback
  - Instructions for enabling in browser settings if denied

- [ ] Test notification button
  - Send sample notification
  - Verify notification appearance

- [ ] Global notification preferences
  - Enable/disable all reminders
  - Quiet hours configuration
  - Sound/vibration preferences

---

### Priority 5: Error Handling & Edge Cases

#### 5.1 Error Handling System
- [ ] Create `src/lib/utils/errors.ts`
  - Define `AppError` class with types from spec
  - `handleStorageError(error): AppError`
  - `handleImportError(error): AppError`
  - User-friendly message mapping

- [ ] Implement error boundaries in layout
  - Catch unexpected errors gracefully
  - Show recovery options

- [ ] Storage quota handling
  - Detect when approaching quota
  - Show warning with cleanup suggestions
  - Offer to export before clearing

- [ ] Storage unavailable fallback
  - Detect IndexedDB unavailable (private browsing)
  - Show informative message
  - Suggest alternatives

#### 5.2 Edge Cases & Empty States
- [ ] First-launch onboarding flow
  - Welcome screen with privacy notice
  - Quick settings (temperature unit, theme)
  - Prompt to create first session
  - Store "onboarding completed" flag

- [ ] Empty states for all list views
  - Sessions list: "No sessions yet" with illustration
  - Timeline: "No entries yet" with log CTA
  - Export: Handle no data gracefully

- [ ] Offline indicator
  - Detect online/offline state
  - Show unobtrusive indicator when offline
  - Reassure data is saved locally

- [ ] Loading states
  - Add loading spinners for async operations
  - Skeleton loaders for data-heavy views

---

### Priority 6: Accessibility & Polish

#### 6.1 Accessibility Audit
- [ ] ARIA labels for all interactive elements
  - Buttons without visible text
  - Emoji selectors
  - Icon-only controls

- [ ] Keyboard navigation
  - Tab order verification
  - Focus indicators visible
  - Escape key for modals
  - Enter key for form submission

- [ ] Screen reader testing
  - Test with VoiceOver (iOS/macOS)
  - Test with NVDA/JAWS (Windows)
  - Verify announcements for dynamic content

- [ ] Color contrast verification
  - Use automated tools (axe, Lighthouse)
  - Fix any issues below 4.5:1 ratio
  - Check in both light and dark modes

- [ ] Touch target verification
  - Ensure all targets >= 44x44px
  - Add padding where needed

- [ ] Reduced motion preference
  - Check `prefers-reduced-motion` media query
  - Disable animations when preference set

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

### Priority 7: Testing

#### 7.1 Unit Tests
**Existing:** dates.test.ts, temperature.test.ts

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

| Priority | Category | Open Tasks |
|----------|----------|------------|
| 1 | Component Refactoring | 6 components |
| 2 | Services Layer | 4 services |
| 3 | Smart Features | 3 feature sets |
| 4 | Configuration Features | 2 features |
| 5 | Error Handling | 8 tasks |
| 6 | Accessibility & Polish | 15+ tasks |
| 7 | Testing | 16+ test files |
| 8 | Documentation & Deployment | 6 tasks |
| **Total** | | **~60 tasks** |

---

## Recommended Implementation Order

### Phase A: Quick Wins (1-2 days)
1. Extract Timeline components (Priority 1.1)
2. Create export service (Priority 2.1)
3. Add loading states and empty states (Priority 5.2)

### Phase B: Core Improvements (2-3 days)
1. Implement SessionWizard multi-step flow (Priority 1.2)
2. Implement trend detection service (Priority 2.3)
3. Add trend indicators to SessionDetail (Priority 3.3)

### Phase C: Advanced Features (3-5 days)
1. Smart timeline grouping (Priority 3.1)
2. Custom metric creator (Priority 4.1)
3. Notification service and reminders (Priority 2.4, 3.2)

### Phase D: Polish & Testing (2-3 days)
1. Accessibility audit and fixes (Priority 6.1)
2. Write missing unit tests (Priority 7.1)
3. Error handling system (Priority 5.1)

### Phase E: Launch Prep (1-2 days)
1. Performance optimization (Priority 6.2)
2. Documentation (Priority 8.1)
3. Deployment setup (Priority 8.2)

---

## Notes

- The MVP is functional and usable. These tasks improve maintainability, features, and polish.
- Priority 1-2 (refactoring) improves code quality but doesn't add user-visible features.
- Priority 3-4 adds the "smart" features from the spec that differentiate this app.
- Priority 5-6 improves reliability and user experience.
- Priority 7-8 ensures quality and enables deployment.

---

*Open Tasks Version: 1.0*
*Last Updated: January 2026*
