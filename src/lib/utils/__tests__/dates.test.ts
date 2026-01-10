import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	formatTime,
	formatDate,
	formatDateTime,
	formatDateFull,
	formatTimeAgo,
	getDaysBetween,
	getHoursBetween,
	hoursAgo,
	isSameDayAs,
	getStartOfDay,
	getEndOfDay,
	formatDuration,
	getDateRangeLabel,
	formatInputDateTime,
	parseInputDateTime
} from '../dates';

describe('Date Formatting', () => {
	describe('formatTime', () => {
		it('formats time in HH:mm format', () => {
			const date = new Date('2024-01-15T14:30:00');
			expect(formatTime(date)).toBe('14:30');
		});

		it('pads single digit hours and minutes', () => {
			const date = new Date('2024-01-15T09:05:00');
			expect(formatTime(date)).toBe('09:05');
		});
	});

	describe('formatDate', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('returns "Today" for current date', () => {
			const now = new Date('2024-01-15T12:00:00');
			vi.setSystemTime(now);
			expect(formatDate(now)).toBe('Today');
		});

		it('returns "Yesterday" for previous day', () => {
			const now = new Date('2024-01-15T12:00:00');
			vi.setSystemTime(now);
			const yesterday = new Date('2024-01-14T12:00:00');
			expect(formatDate(yesterday)).toBe('Yesterday');
		});

		it('returns formatted date for older dates', () => {
			const now = new Date('2024-01-15T12:00:00');
			vi.setSystemTime(now);
			const oldDate = new Date('2024-01-10T12:00:00');
			expect(formatDate(oldDate)).toBe('Jan 10, 2024');
		});
	});

	describe('formatDateTime', () => {
		it('formats full date and time', () => {
			const date = new Date('2024-01-15T14:30:00');
			expect(formatDateTime(date)).toBe('Jan 15, 2024 2:30 PM');
		});
	});

	describe('formatDateFull', () => {
		it('formats date with full month name', () => {
			const date = new Date('2024-01-15T12:00:00');
			expect(formatDateFull(date)).toBe('January 15, 2024');
		});
	});
});

describe('Date Calculations', () => {
	describe('getDaysBetween', () => {
		it('calculates days between two dates', () => {
			const start = new Date('2024-01-01');
			const end = new Date('2024-01-10');
			expect(getDaysBetween(start, end)).toBe(9);
		});

		it('returns 0 for same day', () => {
			const date = new Date('2024-01-01');
			expect(getDaysBetween(date, date)).toBe(0);
		});
	});

	describe('getHoursBetween', () => {
		it('calculates hours between two dates', () => {
			const start = new Date('2024-01-01T10:00:00');
			const end = new Date('2024-01-01T15:00:00');
			expect(getHoursBetween(start, end)).toBe(5);
		});
	});

	describe('hoursAgo', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('calculates hours since date', () => {
			const now = new Date('2024-01-15T15:00:00');
			vi.setSystemTime(now);
			const past = new Date('2024-01-15T10:00:00');
			expect(hoursAgo(past)).toBe(5);
		});
	});

	describe('isSameDayAs', () => {
		it('returns true for same day', () => {
			const date1 = new Date('2024-01-15T10:00:00');
			const date2 = new Date('2024-01-15T22:00:00');
			expect(isSameDayAs(date1, date2)).toBe(true);
		});

		it('returns false for different days', () => {
			const date1 = new Date('2024-01-15T10:00:00');
			const date2 = new Date('2024-01-16T10:00:00');
			expect(isSameDayAs(date1, date2)).toBe(false);
		});
	});
});

describe('Day Boundaries', () => {
	describe('getStartOfDay', () => {
		it('returns start of day', () => {
			const date = new Date('2024-01-15T14:30:45');
			const start = getStartOfDay(date);
			expect(start.getHours()).toBe(0);
			expect(start.getMinutes()).toBe(0);
			expect(start.getSeconds()).toBe(0);
		});
	});

	describe('getEndOfDay', () => {
		it('returns end of day', () => {
			const date = new Date('2024-01-15T10:00:00');
			const end = getEndOfDay(date);
			expect(end.getHours()).toBe(23);
			expect(end.getMinutes()).toBe(59);
			expect(end.getSeconds()).toBe(59);
		});
	});
});

describe('Duration Formatting', () => {
	describe('formatDuration', () => {
		it('handles zero days', () => {
			expect(formatDuration(0)).toBe('Started today');
		});

		it('handles single day', () => {
			expect(formatDuration(1)).toBe('1 day');
		});

		it('handles multiple days', () => {
			expect(formatDuration(5)).toBe('5 days');
			expect(formatDuration(30)).toBe('30 days');
		});
	});
});

describe('Date Range', () => {
	describe('getDateRangeLabel', () => {
		it('formats date range correctly', () => {
			const start = new Date('2024-01-01');
			const end = new Date('2024-01-15');
			expect(getDateRangeLabel(start, end)).toBe('Jan 1 - Jan 15, 2024');
		});
	});
});

describe('Input Formatting', () => {
	describe('formatInputDateTime', () => {
		it('formats date for datetime-local input', () => {
			const date = new Date('2024-01-15T14:30:00');
			expect(formatInputDateTime(date)).toBe('2024-01-15T14:30');
		});
	});

	describe('parseInputDateTime', () => {
		it('parses datetime-local input value', () => {
			const parsed = parseInputDateTime('2024-01-15T14:30');
			expect(parsed.getFullYear()).toBe(2024);
			expect(parsed.getMonth()).toBe(0); // January is 0
			expect(parsed.getDate()).toBe(15);
			expect(parsed.getHours()).toBe(14);
			expect(parsed.getMinutes()).toBe(30);
		});
	});
});
