import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	calculateLinearRegressionSlope,
	getNumericValue,
	filterEntriesByWindow,
	detectTrend,
	getTrendLabel,
	getTrendIcon,
	getTrendArrow,
	getTrendColorClass,
	detectAllTrends,
	calculateOverallTrend
} from '../trends';
import type { Entry, Trend } from '$types';

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

describe('calculateLinearRegressionSlope', () => {
	it('returns 0 for single value', () => {
		expect(calculateLinearRegressionSlope([5])).toBe(0);
	});

	it('returns positive slope for increasing values', () => {
		const slope = calculateLinearRegressionSlope([1, 2, 3, 4, 5]);
		expect(slope).toBeGreaterThan(0);
		expect(slope).toBeCloseTo(1, 5);
	});

	it('returns negative slope for decreasing values', () => {
		const slope = calculateLinearRegressionSlope([5, 4, 3, 2, 1]);
		expect(slope).toBeLessThan(0);
		expect(slope).toBeCloseTo(-1, 5);
	});

	it('returns 0 for constant values', () => {
		const slope = calculateLinearRegressionSlope([5, 5, 5, 5, 5]);
		expect(slope).toBe(0);
	});

	it('handles two values', () => {
		const slope = calculateLinearRegressionSlope([10, 20]);
		expect(slope).toBe(10);
	});

	it('calculates correct slope for non-linear data', () => {
		// Values: 1, 3, 2, 4, 3 - generally increasing with noise
		const slope = calculateLinearRegressionSlope([1, 3, 2, 4, 3]);
		expect(slope).toBeGreaterThan(0);
	});
});

describe('getNumericValue', () => {
	it('extracts temperature celsius value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'temperature',
			value: { type: 'temperature', celsius: 38.5, note: '' }
		});

		expect(getNumericValue(entry)).toBe(38.5);
	});

	it('extracts feeling emoji value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'feeling',
			value: { type: 'feeling', emojiValue: 4, note: '' }
		});

		expect(getNumericValue(entry)).toBe(4);
	});

	it('extracts numeric value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'custom',
			value: { type: 'numeric', value: 150 }
		});

		expect(getNumericValue(entry)).toBe(150);
	});

	it('extracts scale value', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'pain',
			value: { type: 'scale', value: 6 }
		});

		expect(getNumericValue(entry)).toBe(6);
	});

	it('returns null for event type', () => {
		const entry = createEntry({
			timestamp: new Date(),
			metricId: 'medication',
			value: { type: 'event', description: 'Took ibuprofen' }
		});

		expect(getNumericValue(entry)).toBeNull();
	});
});

describe('filterEntriesByWindow', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('filters entries within the time window', () => {
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));

		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-15T10:00:00'), metricId: 'temp' }), // 2 hours ago
			createEntry({ timestamp: new Date('2024-01-15T06:00:00'), metricId: 'temp' }), // 6 hours ago
			createEntry({ timestamp: new Date('2024-01-14T12:00:00'), metricId: 'temp' }) // 24 hours ago
		];

		const filtered = filterEntriesByWindow(entries, 12);

		expect(filtered).toHaveLength(2); // Only entries within 12 hours
	});

	it('returns empty array when no entries in window', () => {
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));

		const entries: Entry[] = [
			createEntry({ timestamp: new Date('2024-01-13T12:00:00'), metricId: 'temp' }) // 48 hours ago
		];

		const filtered = filterEntriesByWindow(entries, 24);

		expect(filtered).toHaveLength(0);
	});
});

describe('detectTrend', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns insufficient_data for too few entries', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.5, note: '' }
			})
		];

		const trend = detectTrend(entries, 'temperature');

		expect(trend).toBe('insufficient_data');
	});

	it('detects worsening temperature trend (increasing)', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T09:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.5, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' }
			})
		];

		const trend = detectTrend(entries, 'temperature');

		expect(trend).toBe('worsening');
	});

	it('detects improving temperature trend (decreasing)', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T09:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.5, note: '' }
			})
		];

		const trend = detectTrend(entries, 'temperature');

		expect(trend).toBe('improving');
	});

	it('detects improving feeling trend (increasing)', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 1, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T09:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 2, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 4, note: '' }
			})
		];

		const trend = detectTrend(entries, 'feeling');

		expect(trend).toBe('improving');
	});

	it('detects stable trend for consistent values', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T09:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const trend = detectTrend(entries, 'temperature');

		expect(trend).toBe('stable');
	});

	it('filters entries by metricId', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, note: '' }
			})
		];

		// Only 1 temperature entry, should be insufficient
		const trend = detectTrend(entries, 'temperature');

		expect(trend).toBe('insufficient_data');
	});
});

describe('getTrendLabel', () => {
	it('returns correct labels', () => {
		expect(getTrendLabel('improving')).toBe('Improving');
		expect(getTrendLabel('stable')).toBe('Stable');
		expect(getTrendLabel('worsening')).toBe('Worsening');
		expect(getTrendLabel('insufficient_data')).toBe('Not enough data');
	});
});

describe('getTrendIcon', () => {
	it('returns correct icons', () => {
		expect(getTrendIcon('improving')).toBe('📈');
		expect(getTrendIcon('stable')).toBe('➡️');
		expect(getTrendIcon('worsening')).toBe('📉');
		expect(getTrendIcon('insufficient_data')).toBe('❓');
	});
});

describe('getTrendArrow', () => {
	it('returns correct arrows', () => {
		expect(getTrendArrow('improving')).toBe('↗');
		expect(getTrendArrow('stable')).toBe('→');
		expect(getTrendArrow('worsening')).toBe('↘');
		expect(getTrendArrow('insufficient_data')).toBe('?');
	});
});

describe('getTrendColorClass', () => {
	it('returns correct color classes', () => {
		expect(getTrendColorClass('improving')).toBe('text-success');
		expect(getTrendColorClass('stable')).toBe('text-neutral-500');
		expect(getTrendColorClass('worsening')).toBe('text-warning');
		expect(getTrendColorClass('insufficient_data')).toBe('text-neutral-400');
	});
});

describe('detectAllTrends', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('detects trends for multiple metrics', () => {
		const entries: Entry[] = [
			// Temperature entries - increasing (worsening)
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			}),
			// Feeling entries - increasing (improving)
			createEntry({
				timestamp: new Date('2024-01-15T08:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 1, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T11:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 5, note: '' }
			})
		];

		const trends = detectAllTrends(entries, ['temperature', 'feeling']);

		expect(trends.get('temperature')).toBe('worsening');
		expect(trends.get('feeling')).toBe('improving');
	});
});

describe('calculateOverallTrend', () => {
	it('returns worsening if any metric is worsening', () => {
		const trends = new Map<string, Trend>([
			['temperature', 'worsening'],
			['feeling', 'improving']
		]);

		expect(calculateOverallTrend(trends)).toBe('worsening');
	});

	it('returns improving if any improving and none worsening', () => {
		const trends = new Map<string, Trend>([
			['temperature', 'improving'],
			['feeling', 'stable']
		]);

		expect(calculateOverallTrend(trends)).toBe('improving');
	});

	it('returns stable if all stable', () => {
		const trends = new Map<string, Trend>([
			['temperature', 'stable'],
			['feeling', 'stable']
		]);

		expect(calculateOverallTrend(trends)).toBe('stable');
	});

	it('returns insufficient_data if all insufficient', () => {
		const trends = new Map<string, Trend>([
			['temperature', 'insufficient_data'],
			['feeling', 'insufficient_data']
		]);

		expect(calculateOverallTrend(trends)).toBe('insufficient_data');
	});

	it('prioritizes stable over insufficient_data', () => {
		const trends = new Map<string, Trend>([
			['temperature', 'stable'],
			['feeling', 'insufficient_data']
		]);

		expect(calculateOverallTrend(trends)).toBe('stable');
	});
});
