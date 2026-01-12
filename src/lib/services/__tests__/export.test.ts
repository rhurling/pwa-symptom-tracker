import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	generateLLMPromptHeader,
	calculateSummaryStats,
	generateChronologicalLog,
	generateSectionedReport,
	generateMarkdownExport
} from '../export';
import type { Entry, TrackingSession } from '$types';

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

describe('generateLLMPromptHeader', () => {
	it('generates general analysis prompt', () => {
		const prompt = generateLLMPromptHeader('general');

		expect(prompt).toContain('Instructions for Analysis');
		expect(prompt).toContain('illness progression');
		expect(prompt).toContain('medical attention');
	});

	it('generates pattern analysis prompt', () => {
		const prompt = generateLLMPromptHeader('patterns');

		expect(prompt).toContain('Pattern Analysis');
		expect(prompt).toContain('Correlations');
		expect(prompt).toContain('Cyclical patterns');
	});

	it('generates treatment analysis prompt', () => {
		const prompt = generateLLMPromptHeader('treatment');

		expect(prompt).toContain('Treatment Analysis');
		expect(prompt).toContain('Effectiveness');
		expect(prompt).toContain('professional medical advice');
	});

	it('returns custom prompt when provided', () => {
		const customPrompt = 'Please analyze for specific symptoms';
		const prompt = generateLLMPromptHeader('custom', customPrompt);

		expect(prompt).toBe(customPrompt);
	});

	it('returns empty string for custom without prompt', () => {
		const prompt = generateLLMPromptHeader('custom');

		expect(prompt).toBe('');
	});
});

describe('calculateSummaryStats', () => {
	it('calculates temperature range and average', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T14:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			})
		];

		const stats = calculateSummaryStats(entries);

		expect(stats.temperatureRange?.min).toBe(37.0);
		expect(stats.temperatureRange?.max).toBe(39.0);
		expect(stats.temperatureRange?.avg).toBeCloseTo(38.17, 1);
	});

	it('calculates feeling average', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 2, emoji: '😞', note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T14:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 4, emoji: '🙂', note: '' }
			})
		];

		const stats = calculateSummaryStats(entries);

		expect(stats.feelingAverage).toBe(3);
	});

	it('counts entries by metric', () => {
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
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: '' }
			})
		];

		const stats = calculateSummaryStats(entries);

		expect(stats.entriesByMetric.get('temperature')).toBe(2);
		expect(stats.entriesByMetric.get('feeling')).toBe(1);
		expect(stats.totalEntries).toBe(3);
	});

	it('calculates date range', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-17T14:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const stats = calculateSummaryStats(entries);

		expect(stats.dateRange.start.getDate()).toBe(17);
		expect(stats.dateRange.end.getDate()).toBe(15);
	});

	it('handles empty entries', () => {
		const stats = calculateSummaryStats([]);

		expect(stats.totalEntries).toBe(0);
		expect(stats.temperatureRange).toBeUndefined();
		expect(stats.feelingAverage).toBeUndefined();
	});
});

describe('generateChronologicalLog', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('groups entries by day', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-14T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const log = generateChronologicalLog(entries, 'celsius', true, true);

		expect(log).toContain('### January 14, 2024');
		expect(log).toContain('### January 15, 2024');
	});

	it('includes time and value', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:30:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.5, note: '' }
			})
		];

		const log = generateChronologicalLog(entries, 'celsius', true, true);

		expect(log).toContain('**10:30**');
		expect(log).toContain('38.5°C');
	});

	it('includes fever warning when annotations enabled', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			})
		];

		const log = generateChronologicalLog(entries, 'celsius', true, true);

		expect(log).toContain('fever');
	});

	it('excludes warnings when annotations disabled', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 39.0, note: '' }
			})
		];

		const log = generateChronologicalLog(entries, 'celsius', true, false);

		expect(log).not.toContain('(fever)');
	});

	it('includes notes when enabled', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: 'Headache' }
			})
		];

		const log = generateChronologicalLog(entries, 'celsius', true, true);

		expect(log).toContain('Headache');
	});

	it('formats temperature in fahrenheit', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const log = generateChronologicalLog(entries, 'fahrenheit', true, true);

		expect(log).toContain('°F');
	});
});

describe('generateSectionedReport', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('includes summary section', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const report = generateSectionedReport(entries, 'celsius');

		expect(report).toContain('## Summary');
		expect(report).toContain('Temperature Range');
	});

	it('includes temperature log table', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const report = generateSectionedReport(entries, 'celsius');

		expect(report).toContain('## Temperature Log');
		expect(report).toContain('| Date | Time | Value | Status |');
	});

	it('includes feeling log table', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'feeling',
				value: { type: 'feeling', emojiValue: 3, emoji: '😐', note: 'Tired' }
			})
		];

		const report = generateSectionedReport(entries, 'celsius');

		expect(report).toContain('## Feeling Log');
		expect(report).toContain('| Date | Time | Feeling | Note |');
	});

	it('includes events table', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'event',
				value: { type: 'event', description: 'Took ibuprofen' }
			})
		];

		const report = generateSectionedReport(entries, 'celsius');

		expect(report).toContain('## Events');
		expect(report).toContain('Took ibuprofen');
	});
});

describe('generateMarkdownExport', () => {
	const session = createSession({ name: 'Cold Recovery' });

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('includes session title', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('# Symptom Log: Cold Recovery');
	});

	it('includes LLM prompt when requested', () => {
		const entries: Entry[] = [];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'general'
		});

		expect(markdown).toContain('Instructions for Analysis');
	});

	it('excludes LLM prompt when style is none', () => {
		const entries: Entry[] = [];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).not.toContain('Instructions for Analysis');
	});

	it('includes session status', () => {
		const entries: Entry[] = [];

		const markdown = generateMarkdownExport({
			session: createSession({ status: 'resolved' }),
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('**Status:** Resolved');
	});

	it('includes entry count', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			}),
			createEntry({
				timestamp: new Date('2024-01-15T12:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('**Total Entries:** 2');
	});

	it('uses chronological format', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'chronological',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('## Chronological Entries');
	});

	it('uses sectioned format', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 37.0, note: '' }
			})
		];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'sectioned',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('## Temperature Log');
	});

	it('uses summary format', () => {
		const entries: Entry[] = [
			createEntry({
				timestamp: new Date('2024-01-15T10:00:00'),
				metricId: 'temperature',
				value: { type: 'temperature', celsius: 38.0, note: '' }
			})
		];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'summary',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none'
		});

		expect(markdown).toContain('## Summary');
		expect(markdown).toContain('Temperature Range');
	});

	it('includes date range when provided', () => {
		const entries: Entry[] = [];

		const markdown = generateMarkdownExport({
			session,
			entries,
			temperatureUnit: 'celsius',
			format: 'summary',
			includeNotes: true,
			includeAnnotations: true,
			llmPromptStyle: 'none',
			dateRange: {
				start: new Date('2024-01-10'),
				end: new Date('2024-01-15')
			}
		});

		expect(markdown).toContain('**Period:**');
	});
});
