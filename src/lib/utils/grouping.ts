import type { Entry, TimelineGroupingConfig, TrackingSession } from '$types';
import { getDaysBetween } from './dates';

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
