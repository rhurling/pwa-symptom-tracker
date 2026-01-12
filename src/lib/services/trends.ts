import type { Entry, Trend } from '$types';

// Minimum entries required for trend detection
const MIN_ENTRIES_FOR_TREND = 3;

// Window size in hours for trend calculation
const DEFAULT_WINDOW_HOURS = 24;

/**
 * Calculate linear regression slope for a series of values
 * Returns positive slope for increasing values, negative for decreasing
 */
export function calculateLinearRegressionSlope(values: number[]): number {
	if (values.length < 2) return 0;

	const n = values.length;
	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumXX = 0;

	for (let i = 0; i < n; i++) {
		sumX += i;
		sumY += values[i];
		sumXY += i * values[i];
		sumXX += i * i;
	}

	// Slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
	const denominator = n * sumXX - sumX * sumX;
	if (denominator === 0) return 0;

	return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Get numeric value from entry for trend calculation
 * Returns null for non-numeric entries
 */
export function getNumericValue(entry: Entry): number | null {
	switch (entry.value.type) {
		case 'temperature':
			return entry.value.celsius;
		case 'feeling':
			return entry.value.emojiValue;
		case 'numeric':
			return entry.value.value;
		case 'scale':
			return entry.value.value;
		case 'event':
			return null; // Events are non-numeric
		default:
			return null;
	}
}

/**
 * Filter entries within a time window
 */
export function filterEntriesByWindow(entries: Entry[], windowHours: number): Entry[] {
	const now = new Date();
	const cutoff = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
	return entries.filter((e) => e.timestamp >= cutoff);
}

/**
 * Detect trend from a series of entries for a specific metric
 *
 * For temperature: increasing is worsening, decreasing is improving
 * For feeling: increasing is improving, decreasing is worsening
 * For other metrics: context-dependent
 */
export function detectTrend(
	entries: Entry[],
	metricId: string,
	windowHours: number = DEFAULT_WINDOW_HOURS
): Trend {
	// Filter entries for the specific metric
	const metricEntries = entries.filter((e) => e.metricId === metricId);

	// Filter by time window
	const windowedEntries = filterEntriesByWindow(metricEntries, windowHours);

	// Need minimum entries for trend detection
	if (windowedEntries.length < MIN_ENTRIES_FOR_TREND) {
		return 'insufficient_data';
	}

	// Sort by timestamp (oldest first)
	const sortedEntries = [...windowedEntries].sort(
		(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
	);

	// Get numeric values
	const values = sortedEntries
		.map((e) => getNumericValue(e))
		.filter((v): v is number => v !== null);

	if (values.length < MIN_ENTRIES_FOR_TREND) {
		return 'insufficient_data';
	}

	// Calculate slope
	const slope = calculateLinearRegressionSlope(values);

	// Determine significance threshold based on metric type
	// Use 5% of the value range as threshold
	const minValue = Math.min(...values);
	const maxValue = Math.max(...values);
	const range = maxValue - minValue;
	const threshold = range > 0 ? range * 0.05 : 0.1;

	// Interpret trend based on metric type
	if (Math.abs(slope) < threshold) {
		return 'stable';
	}

	// For temperature: increasing is worsening
	if (metricId === 'temperature') {
		return slope > 0 ? 'worsening' : 'improving';
	}

	// For feeling: increasing is improving (higher value = better)
	if (metricId === 'feeling') {
		return slope > 0 ? 'improving' : 'worsening';
	}

	// For other metrics: assume increasing is neutral/worsening
	// This can be configured per-metric in future
	return slope > 0 ? 'worsening' : 'improving';
}

/**
 * Get trend label for display
 */
export function getTrendLabel(trend: Trend): string {
	switch (trend) {
		case 'improving':
			return 'Improving';
		case 'stable':
			return 'Stable';
		case 'worsening':
			return 'Worsening';
		case 'insufficient_data':
			return 'Not enough data';
	}
}

/**
 * Get trend icon for display
 */
export function getTrendIcon(trend: Trend): string {
	switch (trend) {
		case 'improving':
			return '📈';
		case 'stable':
			return '➡️';
		case 'worsening':
			return '📉';
		case 'insufficient_data':
			return '❓';
	}
}

/**
 * Get trend arrow for display
 */
export function getTrendArrow(trend: Trend): string {
	switch (trend) {
		case 'improving':
			return '↗';
		case 'stable':
			return '→';
		case 'worsening':
			return '↘';
		case 'insufficient_data':
			return '?';
	}
}

/**
 * Get trend color class for styling
 */
export function getTrendColorClass(trend: Trend): string {
	switch (trend) {
		case 'improving':
			return 'text-success';
		case 'stable':
			return 'text-neutral-500';
		case 'worsening':
			return 'text-warning';
		case 'insufficient_data':
			return 'text-neutral-400';
	}
}

/**
 * Detect trends for all metrics in a session
 */
export function detectAllTrends(
	entries: Entry[],
	metricIds: string[],
	windowHours: number = DEFAULT_WINDOW_HOURS
): Map<string, Trend> {
	const trends = new Map<string, Trend>();

	for (const metricId of metricIds) {
		const trend = detectTrend(entries, metricId, windowHours);
		trends.set(metricId, trend);
	}

	return trends;
}

/**
 * Calculate overall health trend from multiple metric trends
 */
export function calculateOverallTrend(trends: Map<string, Trend>): Trend {
	const trendCounts = {
		improving: 0,
		stable: 0,
		worsening: 0,
		insufficient_data: 0
	};

	for (const trend of trends.values()) {
		trendCounts[trend]++;
	}

	// If any metric is worsening, overall is worsening
	if (trendCounts.worsening > 0) {
		return 'worsening';
	}

	// If any metric is improving and none worsening, improving
	if (trendCounts.improving > 0) {
		return 'improving';
	}

	// If all are stable or insufficient data
	if (trendCounts.insufficient_data === trends.size) {
		return 'insufficient_data';
	}

	return 'stable';
}
