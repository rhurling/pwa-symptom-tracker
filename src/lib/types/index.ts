// User Settings
export interface UserSettings {
	temperatureUnit: 'celsius' | 'fahrenheit';
	theme: 'light' | 'dark' | 'system';
	defaultReminderBehavior: 'smart' | 'scheduled';
	createdAt: Date;
	updatedAt: Date;
}

// Tracking Sessions
export interface TrackingSession {
	id: string;
	name: string;
	description?: string;
	status: 'active' | 'resolved' | 'paused';
	sessionType: 'acute' | 'chronic' | 'monitoring';
	enabledMetrics: MetricConfig[];
	reminderConfig: ReminderConfig;
	createdAt: Date;
	updatedAt: Date;
	resolvedAt?: Date;
}

export interface MetricConfig {
	metricId: string;
	includedInReminders: boolean;
	thresholds?: ThresholdConfig;
}

export interface ThresholdConfig {
	warningLow?: number;
	warningHigh?: number;
	criticalLow?: number;
	criticalHigh?: number;
}

// Metric Definitions
export type MetricType = 'temperature' | 'feeling' | 'event' | 'numeric' | 'scale';

export interface MetricDefinition {
	id: string;
	name: string;
	type: MetricType;
	isBuiltIn: boolean;
	config: TemperatureConfig | FeelingConfig | EventConfig | NumericConfig | ScaleConfig;
	createdAt: Date;
}

export interface TemperatureConfig {
	type: 'temperature';
	validRange: { min: number; max: number };
	defaultThresholds: {
		feverWarning: number;
		feverCritical: number;
		hypoWarning: number;
	};
}

export interface FeelingConfig {
	type: 'feeling';
	emojiScale: EmojiOption[];
}

export interface EmojiOption {
	emoji: string;
	label: string;
	value: number;
}

export interface EventConfig {
	type: 'event';
	placeholder: string;
}

export interface NumericConfig {
	type: 'numeric';
	unit: string;
	validRange?: { min: number; max: number };
	decimalPlaces: number;
}

export interface ScaleConfig {
	type: 'scale';
	min: number;
	max: number;
	minLabel: string;
	maxLabel: string;
	step: number;
}

// Entries
export interface Entry {
	id: string;
	sessionId: string;
	metricId: string;
	timestamp: Date;
	value: EntryValue;
	note?: string;
	isRetrospective: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export type EntryValue =
	| TemperatureValue
	| FeelingValue
	| EventValue
	| NumericValue
	| ScaleValue;

export interface TemperatureValue {
	type: 'temperature';
	celsius: number;
}

export interface FeelingValue {
	type: 'feeling';
	emoji: string;
	emojiValue: number;
	note?: string;
}

export interface EventValue {
	type: 'event';
	description: string;
}

export interface NumericValue {
	type: 'numeric';
	value: number;
}

export interface ScaleValue {
	type: 'scale';
	value: number;
}

// Reminders
export interface ReminderConfig {
	enabled: boolean;
	mode: 'smart' | 'scheduled';
	scheduledTimes?: string[];
	smartConfig?: SmartReminderConfig;
	promptMetricIds: string[];
}

export interface SmartReminderConfig {
	acuteIntervalHours: number;
	recoveryIntervalHours: number;
	baselineIntervalHours: number;
}

export interface ScheduledReminder {
	id: string;
	sessionId: string;
	scheduledFor: Date;
	status: 'pending' | 'sent' | 'dismissed' | 'snoozed';
	snoozedUntil?: Date;
	createdAt: Date;
}

// Export/Import
export interface ExportData {
	exportVersion: string;
	exportedAt: string;
	appVersion: string;
	data: {
		settings: UserSettings;
		customMetrics: MetricDefinition[];
		sessions: TrackingSession[];
		entries: Entry[];
	};
}

export interface ImportResult {
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

export interface MarkdownExportOptions {
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

// Timeline Grouping
export interface TimelineGroupingConfig {
	sessionDuration: number;
	entryCount: number;
	groupBy: 'none' | 'hour' | 'day' | 'week' | 'month';
	showAllEntries: boolean;
	showAggregates: boolean;
	aggregateType: 'latest' | 'average' | 'minmax' | 'notable';
}

// Trends
export type Trend = 'improving' | 'stable' | 'worsening' | 'insufficient_data';

// Errors
export enum ErrorType {
	STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
	STORAGE_UNAVAILABLE = 'storage_unavailable',
	NOTIFICATION_DENIED = 'notification_denied',
	IMPORT_INVALID_FORMAT = 'import_invalid_format',
	IMPORT_VERSION_MISMATCH = 'import_version_mismatch',
	EXPORT_FAILED = 'export_failed',
	DATA_CORRUPTION = 'data_corruption'
}

export interface AppError {
	type: ErrorType;
	message: string;
	recoveryAction?: string;
	technicalDetails?: string;
}
