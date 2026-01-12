import type { Entry, TimelineGroupingConfig, TrackingSession } from '$types';
import { getDaysBetween, getStartOfWeek, getStartOfDay } from './dates';
import { getTemperatureStatus } from './temperature';

export function determineGrouping(session: TrackingSession, entries: Entry[]): TimelineGroupingConfig {
	const durationDays = getDaysBetween(session.createdAt, new Date());
	const entryCount = entries.length;
	const entriesPerDay = entryCount / Math.max(durationDays, 1);

	if (durationDays <= 3) {
		// Acute phase: show everything
		return {
			sessionDuration: durationDays,
			entryCount,
			groupBy: 'none',
			showAllEntries: true,
			showAggregates: false,
			aggregateType: 'latest'
		};
	}

	if (durationDays <= 7) {
		// Short-term: group by time blocks, show all
		return {
			sessionDuration: durationDays,
			entryCount,
			groupBy: 'hour',
			showAllEntries: true,
			showAggregates: false,
			aggregateType: 'latest'
		};
	}

	if (durationDays <= 30) {
		// Medium-term: group by day
		return {
			sessionDuration: durationDays,
			entryCount,
			groupBy: 'day',
			showAllEntries: entriesPerDay < 6,
			showAggregates: true,
			aggregateType: 'average'
		};
	}

	if (durationDays <= 90) {
		// Long-term: group by week
		return {
			sessionDuration: durationDays,
			entryCount,
			groupBy: 'week',
			showAllEntries: false,
			showAggregates: true,
			aggregateType: 'minmax'
		};
	}

	// Very long-term: group by month
	return {
		sessionDuration: durationDays,
		entryCount,
		groupBy: 'month',
		showAllEntries: false,
		showAggregates: true,
		aggregateType: 'notable'
	};
}

export interface GroupedEntries {
	label: string;
	date: Date;
	entries: Entry[];
	aggregates?: GroupAggregates;
}

export interface GroupAggregates {
	[metricId: string]: {
		latest?: number;
		average?: number;
		min?: number;
		max?: number;
		count: number;
	};
}

export interface NotableEvent {
	entry: Entry;
	type: 'threshold_crossed' | 'significant_change' | 'first_entry' | 'recovery';
	description: string;
}

export function groupEntriesByDay(entries: Entry[]): GroupedEntries[] {
	const groups = new Map<string, Entry[]>();

	for (const entry of entries) {
		const key = entry.timestamp.toDateString();
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(entry);
	}

	return Array.from(groups.entries())
		.map(([key, entries]) => ({
			label: key,
			date: new Date(key),
			entries: entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		}))
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function groupEntriesByHour(entries: Entry[], blockSizeHours: number = 4): GroupedEntries[] {
	const groups = new Map<string, Entry[]>();

	for (const entry of entries) {
		const date = entry.timestamp;
		const blockStart = Math.floor(date.getHours() / blockSizeHours) * blockSizeHours;
		const dayKey = date.toDateString();
		const key = `${dayKey}-${blockStart.toString().padStart(2, '0')}`;

		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(entry);
	}

	return Array.from(groups.entries())
		.map(([key, groupEntries]) => {
			const [dayPart, hourPart] = key.split('-');
			const blockStart = parseInt(hourPart);
			const blockEnd = (blockStart + blockSizeHours) % 24;
			const label = `${dayPart} ${blockStart.toString().padStart(2, '0')}:00-${blockEnd.toString().padStart(2, '0')}:00`;

			return {
				label,
				date: new Date(groupEntries[0].timestamp),
				entries: groupEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			};
		})
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function groupEntriesByWeek(entries: Entry[]): GroupedEntries[] {
	const groups = new Map<string, Entry[]>();

	for (const entry of entries) {
		const weekStart = getStartOfWeek(entry.timestamp);
		const key = weekStart.toISOString();

		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(entry);
	}

	return Array.from(groups.entries())
		.map(([key, groupEntries]) => {
			const weekStart = new Date(key);
			const weekEnd = new Date(weekStart);
			weekEnd.setDate(weekEnd.getDate() + 6);

			const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			const label = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;

			return {
				label,
				date: weekStart,
				entries: groupEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			};
		})
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function groupEntriesByMonth(entries: Entry[]): GroupedEntries[] {
	const groups = new Map<string, Entry[]>();

	for (const entry of entries) {
		const date = entry.timestamp;
		const key = `${date.getFullYear()}-${date.getMonth()}`;

		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(entry);
	}

	return Array.from(groups.entries())
		.map(([key, groupEntries]) => {
			const [year, month] = key.split('-').map(Number);
			const date = new Date(year, month, 1);
			const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

			return {
				label,
				date,
				entries: groupEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			};
		})
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function extractNotableEvents(entries: Entry[]): NotableEvent[] {
	const notableEvents: NotableEvent[] = [];
	const sortedEntries = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	// Track previous values by metric for change detection
	const previousValues = new Map<string, number>();
	const thresholdsCrossed = new Set<string>();

	for (let i = 0; i < sortedEntries.length; i++) {
		const entry = sortedEntries[i];

		// Check for first entry of a metric
		if (!previousValues.has(entry.metricId)) {
			notableEvents.push({
				entry,
				type: 'first_entry',
				description: `First ${entry.metricId} entry recorded`
			});
		}

		// Check for threshold crossings (temperature)
		if (entry.value.type === 'temperature') {
			const status = getTemperatureStatus(entry.value.celsius);
			const crossKey = `${entry.metricId}-${status}`;

			if (status !== 'normal' && !thresholdsCrossed.has(crossKey)) {
				thresholdsCrossed.add(crossKey);
				notableEvents.push({
					entry,
					type: 'threshold_crossed',
					description: status === 'fever' ? 'Fever threshold crossed' :
						status === 'high_fever' ? 'High fever detected' :
						status === 'hypothermia' ? 'Low temperature detected' : ''
				});
			}

			// Check for recovery (returning to normal)
			if (status === 'normal' && thresholdsCrossed.size > 0) {
				const wasAbnormal = Array.from(thresholdsCrossed).some(k => k.startsWith('temperature'));
				if (wasAbnormal) {
					notableEvents.push({
						entry,
						type: 'recovery',
						description: 'Temperature returned to normal'
					});
				}
			}
		}

		// Check for significant changes
		const currentValue = getNumericValue(entry);
		const prevValue = previousValues.get(entry.metricId);

		if (currentValue !== null && prevValue !== undefined) {
			const changePercent = Math.abs((currentValue - prevValue) / prevValue) * 100;

			// Significant change threshold: 20% or more
			if (changePercent >= 20) {
				const direction = currentValue > prevValue ? 'increase' : 'decrease';
				notableEvents.push({
					entry,
					type: 'significant_change',
					description: `Significant ${direction} in ${entry.metricId}`
				});
			}
		}

		// Update previous value
		if (currentValue !== null) {
			previousValues.set(entry.metricId, currentValue);
		}
	}

	return notableEvents.sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
}

export function calculateAggregates(
	entries: Entry[],
	metricIds: string[],
	type: 'latest' | 'average' | 'minmax' | 'notable'
): GroupAggregates {
	const aggregates: GroupAggregates = {};

	for (const metricId of metricIds) {
		const metricEntries = entries.filter(e => e.metricId === metricId);
		const values = metricEntries
			.map(getNumericValue)
			.filter((v): v is number => v !== null);

		if (values.length === 0) {
			aggregates[metricId] = { count: 0 };
			continue;
		}

		const aggregate: GroupAggregates[string] = {
			count: metricEntries.length
		};

		switch (type) {
			case 'latest':
				aggregate.latest = values[values.length - 1];
				break;
			case 'average':
				aggregate.average = values.reduce((sum, v) => sum + v, 0) / values.length;
				break;
			case 'minmax':
				aggregate.min = Math.min(...values);
				aggregate.max = Math.max(...values);
				break;
			case 'notable':
				aggregate.min = Math.min(...values);
				aggregate.max = Math.max(...values);
				aggregate.average = values.reduce((sum, v) => sum + v, 0) / values.length;
				break;
		}

		aggregates[metricId] = aggregate;
	}

	return aggregates;
}

export function getNumericValue(entry: Entry): number | null {
	switch (entry.value.type) {
		case 'temperature':
			return entry.value.celsius;
		case 'feeling':
			return entry.value.emojiValue;
		case 'numeric':
		case 'scale':
			return entry.value.value;
		default:
			return null;
	}
}

export function calculateAverage(entries: Entry[], metricId: string): number | null {
	const values = entries
		.filter((e) => e.metricId === metricId)
		.map(getNumericValue)
		.filter((v): v is number => v !== null);

	if (values.length === 0) return null;
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateMinMax(
	entries: Entry[],
	metricId: string
): { min: number; max: number } | null {
	const values = entries
		.filter((e) => e.metricId === metricId)
		.map(getNumericValue)
		.filter((v): v is number => v !== null);

	if (values.length === 0) return null;
	return {
		min: Math.min(...values),
		max: Math.max(...values)
	};
}

// Helper to apply grouping based on config
export function applyGrouping(
	entries: Entry[],
	config: TimelineGroupingConfig
): GroupedEntries[] {
	switch (config.groupBy) {
		case 'none':
			// Return as single group or by day
			return groupEntriesByDay(entries);
		case 'hour':
			return groupEntriesByHour(entries, 4);
		case 'day':
			return groupEntriesByDay(entries);
		case 'week':
			return groupEntriesByWeek(entries);
		case 'month':
			return groupEntriesByMonth(entries);
		default:
			return groupEntriesByDay(entries);
	}
}
