import type { TrackingSession, Entry, MetricDefinition, UserSettings, ExportData, MarkdownExportOptions } from '$types';
import { formatDate, formatTime, formatDateFull, getDateRangeLabel } from '$utils/dates';
import { formatTemperature, getTemperatureStatus, getTemperatureStatusLabel } from '$utils/temperature';
import { db } from '$db';

// LLM Prompt Headers
export function generateLLMPromptHeader(style: 'general' | 'patterns' | 'treatment' | 'custom', customPrompt?: string): string {
	switch (style) {
		case 'general':
			return `# Instructions for Analysis

Please analyze the following symptom log and provide:
1. A summary of the illness progression
2. Notable patterns or observations
3. Any concerning trends that might warrant medical attention
4. General observations about recovery timeline
`;
		case 'patterns':
			return `# Instructions for Pattern Analysis

Please analyze the following symptom log with focus on identifying:
1. Correlations between different symptoms
2. Time-of-day patterns in symptoms
3. Response patterns to medications/interventions
4. Cyclical patterns if present
5. Triggers or aggravating factors suggested by the data
`;
		case 'treatment':
			return `# Instructions for Treatment Analysis

Please analyze the following symptom log with focus on:
1. Effectiveness of logged medications/interventions
2. Time-to-effect for treatments
3. Duration of treatment benefits
4. Suggestions for optimal treatment timing based on patterns
5. Any treatments that appear less effective

Note: This analysis is for informational purposes only and should not replace professional medical advice.
`;
		case 'custom':
			return customPrompt ?? '';
		default:
			return '';
	}
}

// Get metric icon
function getMetricIcon(metricId: string): string {
	switch (metricId) {
		case 'temperature': return '🌡️ Temperature:';
		case 'feeling': return '😐 Feeling:';
		case 'event': return '📝 Event:';
		default: return '📊';
	}
}

// Get entry display value
function getEntryValue(entry: Entry, temperatureUnit: 'celsius' | 'fahrenheit'): string {
	switch (entry.value.type) {
		case 'temperature':
			return formatTemperature(entry.value.celsius, temperatureUnit);
		case 'feeling':
			return `${entry.value.emoji} ${['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'][entry.value.emojiValue]}`;
		case 'event':
			return entry.value.description;
		case 'numeric':
			return `${entry.value.value}`;
		case 'scale':
			return `${entry.value.value}`;
	}
}

// Get temperature warning
function getWarning(entry: Entry): string {
	if (entry.value.type !== 'temperature') return '';
	const status = getTemperatureStatus(entry.value.celsius);
	if (status === 'fever') return ' ⚠️ (fever)';
	if (status === 'high_fever') return ' 🔴 (high fever)';
	if (status === 'hypothermia') return ' ❄️ (low temp)';
	return '';
}

// Summary statistics interface
export interface SummaryStats {
	temperatureRange?: { min: number; max: number; avg: number };
	feelingAverage?: number;
	totalEntries: number;
	entriesByMetric: Map<string, number>;
	dateRange: { start: Date; end: Date };
}

// Calculate summary statistics
export function calculateSummaryStats(entries: Entry[]): SummaryStats {
	const tempEntries = entries.filter((e) => e.value.type === 'temperature');
	const feelingEntries = entries.filter((e) => e.value.type === 'feeling');

	const stats: SummaryStats = {
		totalEntries: entries.length,
		entriesByMetric: new Map(),
		dateRange: {
			start: entries.length > 0 ? entries[entries.length - 1].timestamp : new Date(),
			end: entries.length > 0 ? entries[0].timestamp : new Date()
		}
	};

	// Count by metric
	for (const entry of entries) {
		const count = stats.entriesByMetric.get(entry.metricId) ?? 0;
		stats.entriesByMetric.set(entry.metricId, count + 1);
	}

	// Temperature stats
	if (tempEntries.length > 0) {
		const temps = tempEntries.map((e) => (e.value as { celsius: number }).celsius);
		stats.temperatureRange = {
			min: Math.min(...temps),
			max: Math.max(...temps),
			avg: temps.reduce((a, b) => a + b, 0) / temps.length
		};
	}

	// Feeling stats
	if (feelingEntries.length > 0) {
		const values = feelingEntries.map((e) => (e.value as { emojiValue: number }).emojiValue);
		stats.feelingAverage = values.reduce((a, b) => a + b, 0) / values.length;
	}

	return stats;
}

// Export options interface
export interface GenerateMarkdownOptions {
	session: TrackingSession;
	entries: Entry[];
	temperatureUnit: 'celsius' | 'fahrenheit';
	format: 'chronological' | 'sectioned' | 'summary';
	includeNotes: boolean;
	includeAnnotations: boolean;
	llmPromptStyle: 'general' | 'patterns' | 'treatment' | 'none' | 'custom';
	customPrompt?: string;
	dateRange?: { start: Date; end: Date };
}

// Generate chronological log format
export function generateChronologicalLog(
	entries: Entry[],
	temperatureUnit: 'celsius' | 'fahrenheit',
	includeNotes: boolean,
	includeAnnotations: boolean
): string {
	const lines: string[] = [];

	// Group by day
	const byDay = new Map<string, Entry[]>();
	const sortedEntries = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	for (const entry of sortedEntries) {
		const dayKey = formatDateFull(entry.timestamp);
		if (!byDay.has(dayKey)) {
			byDay.set(dayKey, []);
		}
		byDay.get(dayKey)!.push(entry);
	}

	for (const [day, dayEntries] of byDay) {
		lines.push(`### ${day}\n`);

		for (const entry of dayEntries) {
			const time = formatTime(entry.timestamp);
			const icon = getMetricIcon(entry.metricId);
			const value = getEntryValue(entry, temperatureUnit);
			const warning = includeAnnotations ? getWarning(entry) : '';

			lines.push(`**${time}**`);
			lines.push(`- ${icon} ${value}${warning}`);

			if (includeNotes && entry.note) {
				lines.push(`- Note: "${entry.note}"`);
			}
			if (includeNotes && entry.value.type === 'feeling' && entry.value.note) {
				lines.push(`- Note: "${entry.value.note}"`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}

// Generate sectioned report format
export function generateSectionedReport(
	entries: Entry[],
	temperatureUnit: 'celsius' | 'fahrenheit'
): string {
	const lines: string[] = [];
	const stats = calculateSummaryStats(entries);

	lines.push('## Summary\n');

	// Temperature stats
	if (stats.temperatureRange) {
		lines.push(`- **Temperature Range:** ${formatTemperature(stats.temperatureRange.min, temperatureUnit)} - ${formatTemperature(stats.temperatureRange.max, temperatureUnit)}`);
		lines.push(`- **Average Temperature:** ${formatTemperature(stats.temperatureRange.avg, temperatureUnit)}`);
	}

	// Feeling stats
	if (stats.feelingAverage) {
		lines.push(`- **Average Feeling:** ${stats.feelingAverage.toFixed(1)}/5`);
	}

	lines.push(`- **Total Entries:** ${stats.totalEntries}`);
	lines.push('');
	lines.push('---\n');

	// Temperature log
	const tempEntries = entries.filter((e) => e.value.type === 'temperature');
	if (tempEntries.length > 0) {
		lines.push('## Temperature Log\n');
		lines.push('| Date | Time | Value | Status |');
		lines.push('|------|------|-------|--------|');

		for (const entry of tempEntries) {
			const date = formatDate(entry.timestamp);
			const time = formatTime(entry.timestamp);
			const value = formatTemperature((entry.value as { celsius: number }).celsius, temperatureUnit);
			const status = getTemperatureStatusLabel(getTemperatureStatus((entry.value as { celsius: number }).celsius));
			lines.push(`| ${date} | ${time} | ${value} | ${status} |`);
		}
		lines.push('');
	}

	// Feeling log
	const feelingEntries = entries.filter((e) => e.value.type === 'feeling');
	if (feelingEntries.length > 0) {
		lines.push('## Feeling Log\n');
		lines.push('| Date | Time | Feeling | Note |');
		lines.push('|------|------|---------|------|');

		for (const entry of feelingEntries) {
			const date = formatDate(entry.timestamp);
			const time = formatTime(entry.timestamp);
			const feeling = `${(entry.value as { emoji: string }).emoji}`;
			const note = (entry.value as { note?: string }).note ?? '-';
			lines.push(`| ${date} | ${time} | ${feeling} | ${note} |`);
		}
		lines.push('');
	}

	// Events log
	const eventEntries = entries.filter((e) => e.value.type === 'event');
	if (eventEntries.length > 0) {
		lines.push('## Events\n');
		lines.push('| Date | Time | Event |');
		lines.push('|------|------|-------|');

		for (const entry of eventEntries) {
			const date = formatDate(entry.timestamp);
			const time = formatTime(entry.timestamp);
			const desc = (entry.value as { description: string }).description;
			lines.push(`| ${date} | ${time} | ${desc} |`);
		}
		lines.push('');
	}

	return lines.join('\n');
}

// Generate full markdown export
export function generateMarkdownExport(options: GenerateMarkdownOptions): string {
	const {
		session,
		entries,
		temperatureUnit,
		format,
		includeNotes,
		includeAnnotations,
		llmPromptStyle,
		customPrompt,
		dateRange
	} = options;

	const lines: string[] = [];

	// LLM Prompt Header
	if (llmPromptStyle !== 'none') {
		lines.push(generateLLMPromptHeader(llmPromptStyle, customPrompt));
		lines.push('---\n');
	}

	// Title and metadata
	lines.push(`# Symptom Log: ${session.name}\n`);

	if (dateRange) {
		lines.push(`**Period:** ${getDateRangeLabel(dateRange.start, dateRange.end)}`);
	}
	lines.push(`**Status:** ${session.status.charAt(0).toUpperCase() + session.status.slice(1)}`);
	lines.push(`**Total Entries:** ${entries.length}`);
	lines.push('');
	lines.push('---\n');

	// Content based on format
	if (format === 'chronological') {
		lines.push('## Chronological Entries\n');
		lines.push(generateChronologicalLog(entries, temperatureUnit, includeNotes, includeAnnotations));
	} else if (format === 'sectioned') {
		lines.push(generateSectionedReport(entries, temperatureUnit));
	} else if (format === 'summary') {
		const stats = calculateSummaryStats(entries);
		lines.push('## Summary\n');
		if (stats.temperatureRange) {
			lines.push(`- **Temperature Range:** ${formatTemperature(stats.temperatureRange.min, temperatureUnit)} - ${formatTemperature(stats.temperatureRange.max, temperatureUnit)}`);
		}
		if (stats.feelingAverage) {
			lines.push(`- **Average Feeling:** ${stats.feelingAverage.toFixed(1)}/5`);
		}
		lines.push(`- **Total Entries:** ${stats.totalEntries}`);
	}

	return lines.join('\n');
}

// Copy to clipboard
export async function copyToClipboard(content: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(content);
		return true;
	} catch (error) {
		console.error('Failed to copy:', error);
		return false;
	}
}

// Download as file
export function downloadAsFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

// Generate JSON export data
export async function generateJsonExport(): Promise<ExportData> {
	const [settingsData, sessionsData, metricsData, entriesData] = await Promise.all([
		db.getSettings(),
		db.sessions.toArray(),
		db.metrics.filter((m) => !m.isBuiltIn).toArray(),
		db.entries.toArray()
	]);

	return {
		exportVersion: '1.0',
		exportedAt: new Date().toISOString(),
		appVersion: '1.0.0',
		data: {
			settings: settingsData!,
			customMetrics: metricsData,
			sessions: sessionsData,
			entries: entriesData
		}
	};
}

// Download JSON export
export async function downloadJsonExport(): Promise<void> {
	const exportData = await generateJsonExport();
	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `symptom-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
	a.click();
	URL.revokeObjectURL(url);
}
