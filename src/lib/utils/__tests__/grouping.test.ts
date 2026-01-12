import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	determineGrouping,
	groupEntriesByDay,
	groupEntriesByHour,
	groupEntriesByWeek,
	groupEntriesByMonth,
	extractNotableEvents,
	calculateAggregates,
	getNumericValue,
	calculateAverage,
	calculateMinMax,
	applyGrouping
} from '../grouping';
import type { Entry, TrackingSession, TimelineGroupingConfig } from '$types';

// Helper to create mock entries
function createEntry(
	overrides: Partial<Entry> & { timestamp: Date; metricId: string }
): Entry {
	return {
		id: `entry-${Math.random()}`,
		sessionId: 'session-1',
		value: { type: 'temperature', celsius: 37.0, note: '' },
		...overrides
	};
}

// Helper to create mock session
function createSession(overrides: Partial<TrackingSession> = {}): TrackingSession {
	return {
		id: 'session-1',
		name: 'Test Session',
		status: 'active',
		metrics: ['temperature', 'feeling'],
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date(),
		...overrides
	};
}

describe('determineGrouping', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns "none" grouping for sessions <= 3 days', () => {
		vi.setSystemTime(new Date('2024-01-03'));
		const session = createSession({ createdAt: new Date('2024-01-01') });
		const entries: Entry[] = [];

		const config = determineGrouping(session, entries);

		expect(config.groupBy).toBe('none');
		expect(config.showAllEntries).toBe(true);
		expect(config.showAggregates).toBe(false);
	});

	it('returns "hour" grouping for sessions 4-7 days', () => {
		vi.setSystemTime(new Date('2024-01-06'));
		const session = createSession({ createdAt: new Date('2024-01-01') });
		const entries: Entry[] = [];

		const config = determineGrouping(session, entries);

		expect(config.groupBy).toBe('hour');
		expect(config.showAllEntries).toBe(true);
	});

	it('returns "day" grouping for sessions 8-30 days', () => {
		vi.setSystemTime(new Date('2024-01-20'));
		const session = createSession({ createdAt: new Date('2024-01-01') });
		const entries: Entry[] = [];

		const config = determineGrouping(session, entries);

		expect(config.groupBy).toBe('day');
		expect(config.showAggregates).toBe(true);
		expect(config.aggregateType).toBe('average');
	});

	it('returns "week" grouping for sessions 31-90 days', () => {
		vi.setSystemTime(new Date('2024-02-15'));
		const session = createSession({ createdAt: new Date('2024-01-01') });
		const entries: Entry[] = [];

		const config = determineGrouping(session, entries);

		expect(config.groupBy).toBe('week');
		expect(config.showAllEntries).toBe(false);
		expect(config.aggregateType).toBe('minmax');
	});

	it('returns "month" grouping for sessions > 90 days', () => {
		vi.setSystemTime(new Date('2024-05-01'));
		const session = createSession({ createdAt: new Date('2024-01-01') });
		const entries: Entry[] = [];

		const config = determineGrouping(session, entries);

		expect(config.groupBy).toBe('month');
		expect(config.showAllEntries).toBe(false);
		expect(config.aggregateType).toBe('notable');
	});
});

describe('groupEntriesByDay', () => {
	it('groups entries by day', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temperature' }),
			createEntry({ timestamp: new Date('2024-01-15T14:00:00'), metricId: 'temperature' }),
			createEntry({ timestamp: new Date('2024-01-14T09:00:00'), metricId: 'temperature' })
		];

		const groups = groupEntriesByDay(entries);

		expect(groups).toHaveLength(2);
		expect(groups[0].entries).toHaveLength(2); // Jan 15 (most recent first)
		expect(groups[1].entries).toHaveLength(1); // Jan 14
	});

	it('sorts entries within groups by timestamp descending', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-01-15T14:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-01-15T08:00:00'), metricId: 'temp' })
		];

		const groups = groupEntriesByDay(entries);

		expect(groups[0].entries[0].timestamp.getHours()).toBe(14);
		expect(groups[0].entries[1].timestamp.getHours()).toBe(10);
		expect(groups[0].entries[2].timestamp.getHours()).toBe(8);
	});

	it('returns empty array for empty input', () => {
		const groups = groupEntriesByDay([]);
		expect(groups).toHaveLength(0);
	});
});

describe('groupEntriesByHour', () => {
	it('groups entries by 4-hour blocks by default', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T09:00:00'), metricId: 'temp' }), // 08-12 block
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }), // 08-12 block
			createEntry({ timestamp: new Date('2024-01-15T14:00:00'), metricId: 'temp' }) // 12-16 block
		];

		const groups = groupEntriesByHour(entries, 4);

		expect(groups).toHaveLength(2);
	});

	it('respects custom block size', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T09:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-01-15T11:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-01-15T15:00:00'), metricId: 'temp' })
		];

		// 6-hour blocks: 0-6, 6-12, 12-18
		const groups = groupEntriesByHour(entries, 6);

		expect(groups).toHaveLength(2); // 6-12 and 12-18 blocks
	});
});

describe('groupEntriesByWeek', () => {
	it('groups entries by week', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }), // Week of Jan 14
			createEntry({ timestamp: new Date('2024-01-16T10:00:00'), metricId: 'temp' }), // Week of Jan 14
			createEntry({ timestamp: new Date('2024-01-22T10:00:00'), metricId: 'temp' }) // Week of Jan 21
		];

		const groups = groupEntriesByWeek(entries);

		expect(groups).toHaveLength(2);
	});

	it('generates readable week labels', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' })
		];

		const groups = groupEntriesByWeek(entries);

		expect(groups[0].label).toMatch(/Jan \d+ - Jan \d+/);
	});
});

describe('groupEntriesByMonth', () => {
	it('groups entries by month', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-01-25T10:00:00'), metricId: 'temp' }),
			createEntry({ timestamp: new Date('2024-02-10T10:00:00'), metricId: 'temp' })
		];

		const groups = groupEntriesByMonth(entries);

		expect(groups).toHaveLength(2);
	});

	it('generates readable month labels', () => {
		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' })
		];

		const groups = groupEntriesByMonth(entries);

		expect(groups[0].label).toBe('January 2024');
	});
});

describe('getNumericValue', () => {
	it('extracts temperature value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'temperature',
			value: { type: 'temperature', celsius: 38.5, note: '' }
		});

		expect(getNumericValue(entry)).toBe(38.5);
	});

	it('extracts feeling value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'feeling',
			value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: '' }
		});

		expect(getNumericValue(entry)).toBe(3);
	});

	it('extracts numeric value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'custom',
			value: { type: 'numeric', value: 42 }
		});

		expect(getNumericValue(entry)).toBe(42);
	});

	it('extracts scale value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'pain',
			value: { type: 'scale', value: 7 }
		});

		expect(getNumericValue(entry)).toBe(7);
	});

	it('returns null for event type', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'event',
			value: { type: 'event', description: 'Took medication' }
		});

		expect(getNumericValue(entry)).toBeNull();
	});
});

describe('calculateAggregates', () => {
	it('calculates latest aggregate', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' }
			})
		];

		const aggregates = calculateAggregates(entries, ['temperature'], 'latest');

		expect(aggregates.temperature.latest).toBe(38.5);
		expect(aggregates.temperature.count).toBe(2);
	});

	it('calculates average aggregate', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			})
		];

		const aggregates = calculateAggregates(entries, ['temperature'], 'average');

		expect(aggregates.temperature.average).toBe(38.0);
	});

	it('calculates minmax aggregate', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 36.5, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.5, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const aggregates = calculateAggregates(entries, ['temperature'], 'minmax');

		expect(aggregates.temperature.min).toBe(36.5);
		expect(aggregates.temperature.max).toBe(39.5);
	});

	it('handles empty entries for a metric', () => {
		const aggregates = calculateAggregates([], ['temperature'], 'average');

		expect(aggregates.temperature.count).toBe(0);
	});
});

describe('calculateAverage', () => {
	it('calculates average for a metric', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			})
		];

		expect(calculateAverage(entries, 'temperature')).toBe(38.0);
	});

	it('returns null for empty entries', () => {
		expect(calculateAverage([], 'temperature')).toBeNull();
	});

	it('filters by metricId', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: '' }
			})
		];

		expect(calculateAverage(entries, 'temperature')).toBe(38.0);
		expect(calculateAverage(entries, 'feeling')).toBe(3);
	});
});

describe('calculateMinMax', () => {
	it('calculates min and max for a metric', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.5, note: '' }
			}),
			createEntry({
				timestamp: new Date(),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 36.5, note: '' }
			})
		];

		const result = calculateMinMax(entries, 'temperature');

		expect(result?.min).toBe(36.5);
		expect(result?.max).toBe(39.5);
	});

	it('returns null for empty entries', () => {
		expect(calculateMinMax([], 'temperature')).toBeNull();
	});
});

describe('extractNotableEvents', () => {
	it('identifies first entry for a metric', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const events = extractNotableEvents(entries);

		expect(events).toHaveLength(1);
		expect(events[0].type).toBe('first_entry');
	});

	it('identifies fever threshold crossing', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' } // Fever
			})
		];

		const events = extractNotableEvents(entries);
		const thresholdEvent = events.find((e) => e.type === 'threshold_crossed');

		expect(thresholdEvent).toBeDefined();
		expect(thresholdEvent?.description).toContain('Fever');
	});

	it('identifies significant changes', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 2, emoji: '😞', note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 4, emoji: '🙂', note: '' } // 100% increase
			})
		];

		const events = extractNotableEvents(entries);
		const changeEvent = events.find((e) => e.type === 'significant_change');

		expect(changeEvent).toBeDefined();
		expect(changeEvent?.description).toContain('increase');
	});
});

describe('applyGrouping', () => {
	const entries: Entry[] = [
		createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }),
		createEntry({ timestamp: new Date('2024-01-14T10:00:00'), metricId: 'temp' })
	];

	it('applies day grouping for "none" config', () => {
		const config: TimelineGroupingConfig = {
			sessionDuration: 2,
			entryCount: 2,
			groupBy: 'none',
			showAllEntries: true,
			showAggregates: false,
			aggregateType: 'latest'
		};

		const groups = applyGrouping(entries, config);
		expect(groups).toHaveLength(2);
	});

	it('applies hour grouping', () => {
		const config: TimelineGroupingConfig = {
			sessionDuration: 5,
			entryCount: 2,
			groupBy: 'hour',
			showAllEntries: true,
			showAggregates: false,
			aggregateType: 'latest'
		};

		const groups = applyGrouping(entries, config);
		expect(groups.length).toBeGreaterThan(0);
	});

	it('applies day grouping', () => {
		const config: TimelineGroupingConfig = {
			sessionDuration: 15,
			entryCount: 10,
			groupBy: 'day',
			showAllEntries: true,
			showAggregates: true,
			aggregateType: 'average'
		};

		const groups = applyGrouping(entries, config);
		expect(groups).toHaveLength(2);
	});
});
