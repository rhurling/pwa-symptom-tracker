# PWA Symptom Tracker - Technical Specification

## Overview

A Progressive Web App for tracking health symptoms over time, designed to work fully client-side with no backend dependencies. The app enables users to monitor various health metrics, organize tracking into sessions, visualize data on an annotated timeline, and export data as markdown for analysis.

**Core Principles:**
- Mobile-first responsive design
- Full offline functionality
- Privacy-focused: all data stays on device
- Calm, non-anxiety-inducing visual design

---

## 1. Data Model

### 1.1 User Settings

```typescript
interface UserSettings {
  temperatureUnit: 'celsius' | 'fahrenheit';
  theme: 'light' | 'dark' | 'system';
  defaultReminderBehavior: 'smart' | 'scheduled';
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Tracking Sessions

A session represents a distinct tracking context (e.g., an illness episode or ongoing condition).

```typescript
interface TrackingSession {
  id: string; // UUID
  name: string; // e.g., "Flu - January 2026"
  description?: string;
  status: 'active' | 'resolved' | 'paused';
  sessionType: 'acute' | 'chronic' | 'monitoring';

  // Metrics enabled for this session
  enabledMetrics: MetricConfig[];

  // Reminder configuration
  reminderConfig: ReminderConfig;

  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

interface MetricConfig {
  metricId: string; // References a MetricDefinition
  includedInReminders: boolean;
  thresholds?: ThresholdConfig; // For timeline annotations
}

interface ThresholdConfig {
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
}
```

### 1.3 Metric Definitions

Both built-in and user-defined metrics.

```typescript
interface MetricDefinition {
  id: string;
  name: string;
  type: 'temperature' | 'feeling' | 'event' | 'numeric' | 'scale';
  isBuiltIn: boolean;

  // Type-specific configuration
  config: TemperatureConfig | FeelingConfig | EventConfig | NumericConfig | ScaleConfig;

  createdAt: Date;
}

interface TemperatureConfig {
  type: 'temperature';
  validRange: { min: number; max: number }; // Stored in Celsius internally
  defaultThresholds: {
    feverWarning: number;  // e.g., 37.5
    feverCritical: number; // e.g., 39.0
    hypoWarning: number;   // e.g., 35.5
  };
}

interface FeelingConfig {
  type: 'feeling';
  emojiScale: EmojiOption[];
}

interface EmojiOption {
  emoji: string;
  label: string;
  value: number; // 1-5 for sorting/trending
}

interface EventConfig {
  type: 'event';
  placeholder: string; // e.g., "What happened?"
}

interface NumericConfig {
  type: 'numeric';
  unit: string; // e.g., "mg", "hours", "mmHg"
  validRange?: { min: number; max: number };
  decimalPlaces: number;
}

interface ScaleConfig {
  type: 'scale';
  min: number;
  max: number;
  minLabel: string; // e.g., "No pain"
  maxLabel: string; // e.g., "Worst pain"
  step: number; // e.g., 1 for integers
}
```

### 1.4 Entries

Individual data points logged by the user.

```typescript
interface Entry {
  id: string;
  sessionId: string;
  metricId: string;
  timestamp: Date;

  // The actual value (structure depends on metric type)
  value: TemperatureValue | FeelingValue | EventValue | NumericValue | ScaleValue;

  // Optional note for any entry type
  note?: string;

  // Metadata
  isRetrospective: boolean; // Was this logged after the fact?
  createdAt: Date;
  updatedAt: Date;
}

interface TemperatureValue {
  type: 'temperature';
  celsius: number; // Always stored in Celsius
}

interface FeelingValue {
  type: 'feeling';
  emoji: string;
  emojiValue: number; // 1-5
  note?: string;
}

interface EventValue {
  type: 'event';
  description: string;
}

interface NumericValue {
  type: 'numeric';
  value: number;
}

interface ScaleValue {
  type: 'scale';
  value: number;
}
```

### 1.5 Reminders

```typescript
interface ReminderConfig {
  enabled: boolean;
  mode: 'smart' | 'scheduled';

  // For scheduled mode
  scheduledTimes?: string[]; // ["08:00", "12:00", "18:00", "22:00"]

  // For smart mode
  smartConfig?: {
    acuteIntervalHours: number;   // e.g., 4 hours when actively sick
    recoveryIntervalHours: number; // e.g., 8 hours when improving
    baselineIntervalHours: number; // e.g., 24 hours for monitoring
  };

  // Which metrics to prompt for
  promptMetricIds: string[];
}
```

---

## 2. Built-in Metrics

The app ships with the following pre-configured metrics:

### 2.1 Body Temperature

- **Type:** `temperature`
- **Internal storage:** Celsius (converted on display based on user preference)
- **Valid range:** 34.0°C - 43.0°C
- **Default thresholds:**
  - Hypothermia warning: < 35.5°C
  - Fever warning: > 37.5°C
  - High fever critical: > 39.0°C

### 2.2 General Feeling

- **Type:** `feeling`
- **Emoji scale:**
  | Emoji | Label | Value |
  |-------|-------|-------|
  | 😫 | Terrible | 1 |
  | 😟 | Poor | 2 |
  | 😐 | Okay | 3 |
  | 🙂 | Good | 4 |
  | 😊 | Great | 5 |
- **Includes:** Optional free-text note field

### 2.3 Event

- **Type:** `event`
- **Fields:** Timestamp + freeform text description
- **Examples:** "Took 500mg paracetamol", "Nausea started", "Ate light lunch"

---

## 3. User Interface

### 3.1 Design Principles

- **Mobile-first:** Primary interface optimized for phones, responsive up to desktop
- **Calm aesthetics:**
  - Soft, muted color palette (sage greens, soft blues, warm grays)
  - Avoid harsh reds for warnings; use amber/orange tones instead
  - Gentle transitions and animations
- **Accessibility:** Touch targets minimum 44x44px, readable font sizes
- **Light/Dark mode:** User toggle + system preference detection

### 3.2 App Structure

```
┌─────────────────────────────────────┐
│  Header: App Title + Settings ⚙️    │
├─────────────────────────────────────┤
│                                     │
│         Main Content Area           │
│                                     │
├─────────────────────────────────────┤
│  Bottom Nav: Sessions | Quick Log   │
│              Timeline | Export      │
└─────────────────────────────────────┘
```

### 3.3 Screens

#### 3.3.1 Home / Sessions List

- List of all tracking sessions
- Each session card shows:
  - Name and status badge (Active/Resolved/Paused)
  - Session type indicator (Acute/Chronic/Monitoring)
  - Last entry timestamp
  - Quick stats (e.g., "Day 3", "42 entries")
- Floating action button: "+ New Session"
- Swipe actions: Archive, Delete

#### 3.3.2 Session Detail

- Session header with name, description, status
- Quick action buttons:
  - **Quick Log** (prominent)
  - Edit Session
  - View Timeline
- Recent entries list (last 5-10)
- Summary cards:
  - Current/latest values for each enabled metric
  - Mini trend indicators (↑ improving, ↓ worsening, → stable)

#### 3.3.3 Quick Log Screen

Optimized for rapid entry with minimal taps.

```
┌─────────────────────────────────────┐
│  Quick Log - [Session Name]         │
│  ← Back                    Now ▼    │
├─────────────────────────────────────┤
│                                     │
│  🌡️ Temperature                     │
│  ┌─────────────────────────────┐   │
│  │     [  38.2  ] °C           │   │
│  └─────────────────────────────┘   │
│                                     │
│  😐 How are you feeling?            │
│  ┌─────────────────────────────┐   │
│  │ 😫  😟  😐  🙂  😊           │   │
│  └─────────────────────────────┘   │
│  [ Add note... ]                    │
│                                     │
│  📝 Event                           │
│  [ What happened? ]                 │
│                                     │
│  [Custom metrics if enabled...]     │
│                                     │
├─────────────────────────────────────┤
│         [ Save Entry ]              │
└─────────────────────────────────────┘
```

**Features:**
- Time selector defaults to "Now" but allows backdating (retrospective entries)
- Only shows metrics enabled for the session
- Each metric section is optional (can log just temperature, just feeling, etc.)
- Large touch targets for emoji selection
- Numeric inputs with increment/decrement buttons + direct input
- Single save action logs all filled metrics with same timestamp

#### 3.3.4 Timeline View

The primary visualization screen showing an annotated timeline.

```
┌─────────────────────────────────────┐
│  Timeline - [Session Name]          │
│  ← Back              Filter ▼  ⚙️   │
├─────────────────────────────────────┤
│  Zoom: [6h] [24h] [3d] [7d] [All]   │
├─────────────────────────────────────┤
│                                     │
│  ┌─ Jan 15, 2026 ─────────────────  │
│  │                                  │
│  │  08:00  🌡️ 38.4°C ⚠️            │
│  │         😟 Poor                  │
│  │         "Headache, body aches"   │
│  │                                  │
│  │  08:30  📝 Took 500mg ibuprofen  │
│  │                                  │
│  │  12:00  🌡️ 37.8°C               │
│  │         😐 Okay                  │
│  │                                  │
│  │  14:00  📝 Ate light soup        │
│  │         ────── trend: improving  │
│  │                                  │
│  └─────────────────────────────────  │
│                                     │
│  ┌─ Jan 14, 2026 ─────────────────  │
│  │  ...                             │
│                                     │
└─────────────────────────────────────┘
```

**Features:**
- **Smart auto-grouping:**
  - Acute sessions (< 7 days): Show all entries, grouped by time of day
  - Medium-term (7-30 days): Group by day, show key entries
  - Long-term (> 30 days): Group by week, show averages and notable events
- **Annotations (all togglable):**
  - Threshold indicators (⚠️ warning, 🔴 critical)
  - Trend markers between entries
  - Medication/event markers
- **Interactions:**
  - Tap entry to view/edit full details
  - Long-press to delete
  - Pinch to zoom (mobile)
- **Filter options:**
  - By metric type
  - By date range
  - Show/hide annotations

#### 3.3.5 Entry Detail / Edit Modal

```
┌─────────────────────────────────────┐
│  Edit Entry                    ✕    │
├─────────────────────────────────────┤
│                                     │
│  📅 January 15, 2026               │
│  🕐 08:00 AM                 [Edit] │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  🌡️ Temperature                     │
│  [  38.4  ] °C                      │
│                                     │
│  😟 Feeling: Poor                   │
│  Note: "Headache, body aches"       │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ⓘ Logged at 08:02 AM              │
│    (Retrospective: No)              │
│                                     │
├─────────────────────────────────────┤
│  [ Delete ]           [ Save ]      │
└─────────────────────────────────────┘
```

#### 3.3.6 New Session Wizard

Step-by-step session creation:

**Step 1: Basics**
- Session name (required)
- Description (optional)
- Session type: Acute Illness / Chronic Condition / General Monitoring

**Step 2: Select Metrics**
- Checklist of available metrics (built-in + custom)
- Quick preview of what each metric tracks
- Option to create new custom metric inline

**Step 3: Configure Thresholds (Optional)**
- For numeric metrics, set custom warning/critical thresholds
- Shows defaults, allows override

**Step 4: Set Up Reminders**
- Enable/disable reminders
- Choose mode:
  - **Smart:** App adjusts frequency based on recent entries
  - **Scheduled:** Pick specific times
- Select which metrics each reminder should prompt for

**Step 5: Review & Create**
- Summary of all settings
- "Start Tracking" button

#### 3.3.7 Custom Metric Creator

```
┌─────────────────────────────────────┐
│  New Custom Metric             ✕    │
├─────────────────────────────────────┤
│                                     │
│  Name: [ Pain Level            ]    │
│                                     │
│  Type:                              │
│  ○ Number (e.g., blood pressure)    │
│  ● Scale (e.g., 1-10 rating)        │
│  ○ Event (text log)                 │
│                                     │
│  ─── Scale Settings ───             │
│                                     │
│  Minimum: [ 0 ]   Label: [No pain]  │
│  Maximum: [ 10 ]  Label: [Worst]    │
│  Step: [ 1 ]                        │
│                                     │
├─────────────────────────────────────┤
│              [ Create Metric ]      │
└─────────────────────────────────────┘
```

#### 3.3.8 Export Screen

```
┌─────────────────────────────────────┐
│  Export Data                   ✕    │
├─────────────────────────────────────┤
│                                     │
│  Session: [Flu - January 2026  ▼]   │
│                                     │
│  Date Range:                        │
│  [ Jan 13, 2026 ] → [ Jan 17, 2026 ]│
│                                     │
│  ─── Format Options ───             │
│                                     │
│  Structure:                         │
│  ☑ Chronological log                │
│  ☑ Sectioned report                 │
│  ☐ Summary statistics only          │
│                                     │
│  Include:                           │
│  ☑ All metrics                      │
│  ☑ Notes                            │
│  ☑ Threshold annotations            │
│  ☐ Raw data tables                  │
│                                     │
│  ─── LLM Analysis ───               │
│                                     │
│  ☑ Include analysis prompt header   │
│  Prompt style:                      │
│  ○ General analysis                 │
│  ● Pattern identification           │
│  ○ Treatment correlation            │
│  ○ Custom: [                    ]   │
│                                     │
├─────────────────────────────────────┤
│  [ Preview ]      [ Copy to Clipboard ]
│              [ Download .md ]       │
└─────────────────────────────────────┘
```

#### 3.3.9 Settings Screen

```
┌─────────────────────────────────────┐
│  Settings                      ←    │
├─────────────────────────────────────┤
│                                     │
│  ─── Display ───                    │
│                                     │
│  Temperature Unit                   │
│  [ Celsius ▼ ]                      │
│                                     │
│  Theme                              │
│  ○ Light  ● Dark  ○ System          │
│                                     │
│  ─── Data ───                       │
│                                     │
│  [ Export All Data (JSON) ]         │
│  [ Import Data ]                    │
│                                     │
│  ─── Custom Metrics ───             │
│                                     │
│  [ Manage Custom Metrics → ]        │
│                                     │
│  ─── Notifications ───              │
│                                     │
│  [ Notification Settings → ]        │
│                                     │
│  ─── About ───                      │
│                                     │
│  Version 1.0.0                      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔒 Privacy Notice            │   │
│  │ Your data never leaves your │   │
│  │ device. All information is  │   │
│  │ stored locally and is only  │   │
│  │ shared when you explicitly  │   │
│  │ export it.                  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## 4. Smart Features

### 4.1 Smart Auto-Grouping Algorithm

The timeline automatically adjusts detail level based on session duration and data density:

```typescript
interface TimelineGroupingConfig {
  sessionDuration: number; // in days
  entryCount: number;

  // Resulting configuration
  groupBy: 'none' | 'hour' | 'day' | 'week' | 'month';
  showAllEntries: boolean;
  showAggregates: boolean;
  aggregateType: 'latest' | 'average' | 'minmax' | 'notable';
}

function determineGrouping(session: TrackingSession, entries: Entry[]): TimelineGroupingConfig {
  const durationDays = daysBetween(session.createdAt, new Date());
  const entryCount = entries.length;
  const entriesPerDay = entryCount / Math.max(durationDays, 1);

  if (durationDays <= 3) {
    // Acute phase: show everything
    return {
      groupBy: 'none',
      showAllEntries: true,
      showAggregates: false,
      aggregateType: 'latest'
    };
  }

  if (durationDays <= 7) {
    // Short-term: group by time blocks, show all
    return {
      groupBy: 'hour', // 4-hour blocks
      showAllEntries: true,
      showAggregates: false,
      aggregateType: 'latest'
    };
  }

  if (durationDays <= 30) {
    // Medium-term: group by day
    return {
      groupBy: 'day',
      showAllEntries: entriesPerDay < 6,
      showAggregates: true,
      aggregateType: 'average'
    };
  }

  if (durationDays <= 90) {
    // Long-term: group by week
    return {
      groupBy: 'week',
      showAllEntries: false,
      showAggregates: true,
      aggregateType: 'minmax' // Show range
    };
  }

  // Very long-term: group by month
  return {
    groupBy: 'month',
    showAllEntries: false,
    showAggregates: true,
    aggregateType: 'notable' // Threshold crossings, significant events
  };
}
```

### 4.2 Smart Reminders Algorithm

Adjusts reminder frequency based on symptom severity and trends:

```typescript
function calculateNextReminder(session: TrackingSession, recentEntries: Entry[]): Date {
  const config = session.reminderConfig.smartConfig;
  if (!config) return null;

  // Analyze recent entries (last 24 hours)
  const recentTemps = getRecentTemperatures(recentEntries, 24);
  const recentFeelings = getRecentFeelings(recentEntries, 24);

  // Determine severity level
  const hasFever = recentTemps.some(t => t.celsius >= 37.5);
  const hasHighFever = recentTemps.some(t => t.celsius >= 39.0);
  const feelingPoor = recentFeelings.some(f => f.emojiValue <= 2);

  // Determine trend
  const trend = calculateTrend(recentEntries); // -1 worsening, 0 stable, 1 improving

  let intervalHours: number;

  if (hasHighFever || (hasFever && feelingPoor)) {
    // Acute: frequent reminders
    intervalHours = config.acuteIntervalHours; // e.g., 4 hours
  } else if (hasFever || feelingPoor || trend < 0) {
    // Moderate: regular reminders
    intervalHours = (config.acuteIntervalHours + config.recoveryIntervalHours) / 2;
  } else if (trend > 0) {
    // Improving: less frequent
    intervalHours = config.recoveryIntervalHours; // e.g., 8 hours
  } else {
    // Baseline monitoring
    intervalHours = config.baselineIntervalHours; // e.g., 24 hours
  }

  const lastEntry = recentEntries[0];
  return addHours(lastEntry?.timestamp || new Date(), intervalHours);
}
```

### 4.3 Trend Detection

```typescript
type Trend = 'improving' | 'stable' | 'worsening' | 'insufficient_data';

function detectTrend(entries: Entry[], metricId: string, windowHours: number = 24): Trend {
  const metricEntries = entries
    .filter(e => e.metricId === metricId)
    .filter(e => hoursAgo(e.timestamp) <= windowHours)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (metricEntries.length < 3) {
    return 'insufficient_data';
  }

  // Calculate moving average slope
  const values = metricEntries.map(e => getNumericValue(e));
  const slope = calculateLinearRegressionSlope(values);

  // For temperature: negative slope = improving (cooling down)
  // For feeling: positive slope = improving (feeling better)
  const isInverseMetric = metricId === 'temperature';
  const normalizedSlope = isInverseMetric ? -slope : slope;

  const THRESHOLD = 0.1; // Configurable sensitivity

  if (normalizedSlope > THRESHOLD) return 'improving';
  if (normalizedSlope < -THRESHOLD) return 'worsening';
  return 'stable';
}
```

---

## 5. Data Persistence

### 5.1 Storage Strategy

**Primary Storage:** IndexedDB via a wrapper library (e.g., Dexie.js or idb)

**Database Schema:**

```typescript
interface SymptomTrackerDB {
  settings: UserSettings; // Single record
  sessions: TrackingSession[];
  metrics: MetricDefinition[];
  entries: Entry[];
  reminders: ScheduledReminder[];
}

// IndexedDB indexes for efficient queries
const indexes = {
  entries: [
    'sessionId',
    'metricId',
    'timestamp',
    '[sessionId+timestamp]', // Compound index for session timeline
    '[sessionId+metricId+timestamp]' // For metric-specific queries
  ],
  sessions: [
    'status',
    'updatedAt'
  ]
};
```

### 5.2 Export Format (JSON)

Full data export for backup/restore:

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-01-15T10:30:00Z",
  "appVersion": "1.0.0",
  "data": {
    "settings": { ... },
    "customMetrics": [ ... ],
    "sessions": [ ... ],
    "entries": [ ... ]
  }
}
```

### 5.3 Import Validation

```typescript
interface ImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    sessionsImported: number;
    entriesImported: number;
    metricsImported: number;
    duplicatesSkipped: number;
  };
}

function validateImport(data: unknown): ImportResult {
  // Validate structure
  // Validate version compatibility
  // Check for duplicate IDs
  // Validate referential integrity (entries reference valid sessions/metrics)
  // Validate data types and ranges
}
```

---

## 6. Markdown Export

### 6.1 Export Options

```typescript
interface MarkdownExportOptions {
  sessionId: string;
  dateRange: { start: Date; end: Date };

  structure: {
    chronological: boolean;
    sectioned: boolean;
    summaryOnly: boolean;
  };

  include: {
    allMetrics: boolean;
    specificMetrics?: string[];
    notes: boolean;
    thresholdAnnotations: boolean;
    rawDataTables: boolean;
  };

  llmPrompt: {
    enabled: boolean;
    style: 'general' | 'patterns' | 'treatment' | 'custom';
    customPrompt?: string;
  };
}
```

### 6.2 Export Templates

#### Chronological Log Format

```markdown
# Symptom Log: Flu - January 2026

**Period:** January 13-17, 2026
**Duration:** 5 days
**Status:** Resolved

---

## Chronological Entries

### January 13, 2026

**08:00**
- 🌡️ Temperature: 38.4°C ⚠️ (fever)
- 😟 Feeling: Poor
- Note: "Woke up with chills and headache"

**08:30**
- 📝 Event: Took 500mg paracetamol

**12:00**
- 🌡️ Temperature: 37.9°C ⚠️
- 😐 Feeling: Okay
- Note: "Paracetamol helped with headache"

**12:15**
- 📝 Event: Ate light soup

[... continues ...]
```

#### Sectioned Report Format

```markdown
# Symptom Report: Flu - January 2026

**Period:** January 13-17, 2026
**Duration:** 5 days
**Status:** Resolved

---

## Summary

- **Temperature Range:** 36.8°C - 38.9°C
- **Fever Duration:** ~36 hours (Jan 13 08:00 - Jan 14 20:00)
- **Peak Temperature:** 38.9°C on Jan 13 at 18:00
- **Overall Feeling Trend:** Poor → Great (improving)
- **Total Entries:** 42

---

## Temperature Log

| Date | Time | Value | Status | Notes |
|------|------|-------|--------|-------|
| Jan 13 | 08:00 | 38.4°C | ⚠️ Fever | Woke with chills |
| Jan 13 | 12:00 | 37.9°C | ⚠️ Fever | Post-paracetamol |
| Jan 13 | 18:00 | 38.9°C | ⚠️ High | Peak fever |
[...]

---

## Feeling Log

| Date | Time | Feeling | Notes |
|------|------|---------|-------|
| Jan 13 | 08:00 | 😟 Poor | Headache, body aches |
| Jan 13 | 12:00 | 😐 Okay | Headache improved |
[...]

---

## Events & Medications

| Date | Time | Event |
|------|------|-------|
| Jan 13 | 08:30 | Took 500mg paracetamol |
| Jan 13 | 12:15 | Ate light soup |
| Jan 13 | 14:00 | Took 500mg paracetamol |
[...]

---

## Notes & Observations

- Jan 13: "Woke up with chills and headache. Body aches throughout."
- Jan 14: "Fever broke overnight. Still fatigued but improving."
[...]
```

### 6.3 LLM Prompt Headers

#### General Analysis

```markdown
# Instructions for Analysis

Please analyze the following symptom log and provide:
1. A summary of the illness progression
2. Notable patterns or observations
3. Any concerning trends that might warrant medical attention
4. General observations about recovery timeline

---

[Symptom data follows...]
```

#### Pattern Identification

```markdown
# Instructions for Pattern Analysis

Please analyze the following symptom log with focus on identifying:
1. Correlations between different symptoms
2. Time-of-day patterns in symptoms
3. Response patterns to medications/interventions
4. Cyclical patterns if present
5. Triggers or aggravating factors suggested by the data

---

[Symptom data follows...]
```

#### Treatment Correlation

```markdown
# Instructions for Treatment Analysis

Please analyze the following symptom log with focus on:
1. Effectiveness of logged medications/interventions
2. Time-to-effect for treatments
3. Duration of treatment benefits
4. Suggestions for optimal treatment timing based on patterns
5. Any treatments that appear less effective

Note: This analysis is for informational purposes only and should not replace professional medical advice.

---

[Symptom data follows...]
```

---

## 7. PWA Configuration

### 7.1 Service Worker Strategy

```typescript
// Caching strategy
const cacheConfig = {
  // App shell: cache-first
  appShell: [
    '/',
    '/index.html',
    '/app.js',
    '/styles.css',
    '/manifest.json'
  ],

  // Runtime caching: stale-while-revalidate for assets
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      strategy: 'StaleWhileRevalidate',
      options: {
        cacheName: 'images',
        expiration: { maxEntries: 50 }
      }
    }
  ]
};
```

### 7.2 Web App Manifest

```json
{
  "name": "Symptom Tracker",
  "short_name": "Symptoms",
  "description": "Track health symptoms privately on your device",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f7f5",
  "theme_color": "#6b8f71",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["health", "medical", "lifestyle"]
}
```

### 7.3 Notification Configuration

```typescript
interface NotificationConfig {
  permission: 'default' | 'granted' | 'denied';

  // Notification content
  reminderNotification: {
    title: "Time to log symptoms";
    body: "Tap to record how you're feeling";
    icon: "/icons/notification-icon.png";
    badge: "/icons/badge-icon.png";
    tag: "symptom-reminder";
    requireInteraction: false;
    actions: [
      { action: 'log', title: 'Log Now' },
      { action: 'snooze', title: 'Snooze 1h' }
    ];
  };
}
```

---

## 8. Color System

### 8.1 Light Theme

```css
:root {
  /* Primary - Sage Green (calming, health-associated) */
  --color-primary-50: #f0f5f1;
  --color-primary-100: #d4e5d7;
  --color-primary-200: #b8d4bd;
  --color-primary-300: #9cc4a3;
  --color-primary-400: #80b389;
  --color-primary-500: #6b8f71; /* Main primary */
  --color-primary-600: #567259;
  --color-primary-700: #415541;

  /* Neutral - Warm Gray */
  --color-neutral-50: #fafaf9;
  --color-neutral-100: #f5f5f4;
  --color-neutral-200: #e7e5e4;
  --color-neutral-300: #d6d3d1;
  --color-neutral-400: #a8a29e;
  --color-neutral-500: #78716c;
  --color-neutral-600: #57534e;
  --color-neutral-700: #44403c;
  --color-neutral-800: #292524;
  --color-neutral-900: #1c1917;

  /* Status Colors (muted, non-alarming) */
  --color-warning: #d4a574;    /* Warm amber, not harsh orange */
  --color-warning-bg: #fef7ed;
  --color-caution: #c9a227;    /* Muted gold */
  --color-caution-bg: #fefce8;
  --color-info: #7ba3c9;       /* Soft blue */
  --color-info-bg: #eff6ff;
  --color-success: #7dab8a;    /* Muted green */
  --color-success-bg: #f0fdf4;

  /* Semantic */
  --color-background: var(--color-neutral-50);
  --color-surface: #ffffff;
  --color-text-primary: var(--color-neutral-800);
  --color-text-secondary: var(--color-neutral-500);
  --color-border: var(--color-neutral-200);
}
```

### 8.2 Dark Theme

```css
[data-theme="dark"] {
  --color-primary-500: #8fb996;
  --color-primary-600: #a8ccae;

  --color-background: #1a1d1a;
  --color-surface: #242824;
  --color-text-primary: #e8e8e6;
  --color-text-secondary: #a0a09e;
  --color-border: #3d423d;

  /* Status colors adjusted for dark mode */
  --color-warning: #e0b88a;
  --color-warning-bg: #3d3020;
  --color-caution: #dbb842;
  --color-caution-bg: #3d3820;
  --color-info: #8eb5d6;
  --color-info-bg: #203040;
  --color-success: #90c49d;
  --color-success-bg: #1a301d;
}
```

---

## 9. Error Handling

### 9.1 Error Types

```typescript
enum ErrorType {
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
  STORAGE_UNAVAILABLE = 'storage_unavailable',
  NOTIFICATION_DENIED = 'notification_denied',
  IMPORT_INVALID_FORMAT = 'import_invalid_format',
  IMPORT_VERSION_MISMATCH = 'import_version_mismatch',
  EXPORT_FAILED = 'export_failed',
  DATA_CORRUPTION = 'data_corruption'
}

interface AppError {
  type: ErrorType;
  message: string;
  recoveryAction?: string;
  technicalDetails?: string;
}
```

### 9.2 Error Messages (User-Friendly)

| Error Type | User Message | Recovery Action |
|------------|--------------|-----------------|
| Storage quota exceeded | "Your device is running low on storage. Consider exporting and deleting old sessions." | Link to export, list of archivable sessions |
| Storage unavailable | "Unable to save data. Please check your browser settings allow local storage." | Instructions for enabling storage |
| Notification denied | "Reminders won't work without notification permission. You can enable this in Settings." | Link to browser settings |
| Import invalid | "This file doesn't appear to be a valid Symptom Tracker export." | None |
| Import version mismatch | "This export is from a newer version of the app. Please update to import this data." | None |

---

## 10. Security & Privacy

### 10.1 Data Privacy

- **No network requests:** App functions entirely offline after initial load
- **No analytics:** No tracking, telemetry, or usage data collection
- **Local storage only:** All data stored in browser's IndexedDB
- **User-controlled export:** Data only leaves device when user explicitly exports

### 10.2 Privacy Notice (In-App)

Display prominently in Settings and on first launch:

> **Your Privacy**
>
> This app is designed with your privacy as a priority:
>
> - ✓ All data is stored only on your device
> - ✓ No accounts or sign-ups required
> - ✓ No data is sent to any server
> - ✓ No analytics or tracking
> - ✓ You control all exports
>
> Your health information never leaves your device unless you choose to export it.

### 10.3 Data Handling

```typescript
// All data transformations happen client-side
const securityPolicies = {
  // No external requests
  contentSecurityPolicy: "default-src 'self'; script-src 'self'",

  // Clear data on user request
  dataClear: async () => {
    await db.delete();
    localStorage.clear();
    // Optionally unregister service worker
  },

  // Export excludes any system metadata
  sanitizeExport: (data: ExportData) => {
    // Remove any browser-specific identifiers
    // Ensure no accidental PII leakage
    return sanitizedData;
  }
};
```

---

## 11. Accessibility

### 11.1 Requirements

- **WCAG 2.1 AA compliance** as minimum target
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** 4.5:1 for normal text, 3:1 for large text
- **Screen reader support:** Proper ARIA labels and semantic HTML
- **Keyboard navigation:** Full app navigable via keyboard
- **Reduced motion:** Respect `prefers-reduced-motion` preference

### 11.2 Implementation Notes

```typescript
// Emoji accessibility - always pair with text labels
<button aria-label="Feeling: Poor">
  <span aria-hidden="true">😟</span>
  <span class="sr-only">Poor</span>
</button>

// Timeline entries
<article
  role="listitem"
  aria-label="January 15, 8:00 AM: Temperature 38.4 degrees Celsius, fever warning"
>
  ...
</article>

// Form inputs
<label for="temperature">Temperature</label>
<input
  id="temperature"
  type="number"
  aria-describedby="temp-unit temp-status"
  inputmode="decimal"
/>
<span id="temp-unit">°C</span>
<span id="temp-status" role="status" aria-live="polite">
  Warning: Fever detected
</span>
```

---

## 12. Technical Stack Recommendations

### 12.1 Recommended Technologies

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | SvelteKit or Solid.js | Small bundle size, excellent performance, good PWA support |
| Alt Framework | React with Vite | If team prefers React ecosystem |
| Storage | Dexie.js (IndexedDB wrapper) | Excellent DX, reactive queries, good TypeScript support |
| State | Framework native (Svelte stores / Solid signals) | Minimize dependencies |
| CSS | Tailwind CSS | Rapid development, easy theming |
| PWA | Vite PWA Plugin | Zero-config service worker generation |
| Testing | Vitest + Testing Library | Fast, framework-agnostic |
| Date handling | date-fns | Tree-shakeable, immutable |

### 12.2 Bundle Size Budget

- **Initial load (gzipped):** < 50KB JavaScript, < 20KB CSS
- **Total app size:** < 200KB (excluding icons)
- **Time to interactive:** < 2 seconds on 3G

### 12.3 Browser Support

- **Primary:** Last 2 versions of Chrome, Safari, Firefox, Edge
- **Mobile:** iOS Safari 15+, Chrome for Android 90+
- **Required APIs:** IndexedDB, Service Workers, Notifications API, Web App Manifest

---

## 13. File Structure

```
symptom-tracker/
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
│   │   ├── +page.svelte           (Home/Sessions list)
│   │   ├── +layout.svelte
│   │   ├── session/
│   │   │   ├── new/
│   │   │   │   └── +page.svelte   (New session wizard)
│   │   │   └── [id]/
│   │   │       ├── +page.svelte   (Session detail)
│   │   │       ├── log/
│   │   │       │   └── +page.svelte (Quick log)
│   │   │       └── timeline/
│   │   │           └── +page.svelte (Timeline view)
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

## 14. Future Considerations

These features are out of scope for the ideal state v1 but documented for potential future development:

1. **Multi-profile support** - Track symptoms for multiple family members
2. **Cloud sync** - Optional encrypted backup to user's cloud storage
3. **Data visualization** - Charts and graphs beyond timeline
4. **Integrations** - Export to Apple Health, Google Fit
5. **Localization** - Multi-language support
6. **Shareable reports** - Generate PDFs for healthcare providers
7. **Medication database** - Autocomplete for common medications
8. **Symptom suggestions** - Common symptom templates for quick logging
9. **Voice input** - "Log temperature 38.2" via speech recognition
10. **Watch app companion** - Quick logging from smartwatch

---

## Appendix A: User Flows

### A.1 First Launch Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Welcome   │────▶│   Privacy   │────▶│  Settings   │
│   Screen    │     │   Notice    │     │  (optional) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ Create First│
                                        │   Session   │
                                        └─────────────┘
```

### A.2 Daily Usage Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Notification│────▶│  Quick Log  │────▶│   Saved     │
│   Reminder  │     │   Screen    │     │  Confirmation
└─────────────┘     └─────────────┘     └─────────────┘
       │
       │ (or open app manually)
       ▼
┌─────────────┐     ┌─────────────┐
│   Sessions  │────▶│  Session    │────▶ [Quick Log]
│    List     │     │   Detail    │────▶ [Timeline]
└─────────────┘     └─────────────┘────▶ [Export]
```

### A.3 Export Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Select    │────▶│  Configure  │────▶│   Preview   │
│   Session   │     │   Options   │     │  Markdown   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    ▼                          ▼                          ▼
             ┌─────────────┐           ┌─────────────┐            ┌─────────────┐
             │    Copy     │           │   Download  │            │   Share     │
             │  Clipboard  │           │    File     │            │  (native)   │
             └─────────────┘           └─────────────┘            └─────────────┘
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Session** | A tracking context representing an illness episode or ongoing condition |
| **Metric** | A type of measurement (temperature, feeling, custom value) |
| **Entry** | A single data point logged at a specific time |
| **Acute** | Short-term illness tracking (typically < 2 weeks) |
| **Chronic** | Long-term condition monitoring (ongoing) |
| **Smart Reminders** | System that adjusts reminder frequency based on symptom severity |
| **Retrospective Entry** | An entry logged after the fact with a backdated timestamp |
| **Threshold** | A value boundary that triggers warnings/annotations |
| **Timeline Grouping** | Automatic aggregation of entries based on time span |

---

*Specification Version: 1.0*
*Last Updated: January 2026*
