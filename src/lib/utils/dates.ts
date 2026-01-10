import {
	format,
	formatDistanceToNow,
	differenceInDays,
	differenceInHours,
	startOfDay,
	endOfDay,
	startOfWeek,
	endOfWeek,
	isToday,
	isYesterday,
	isSameDay,
	addHours
} from 'date-fns';

export function formatTime(date: Date): string {
	return format(date, 'HH:mm');
}

export function formatDate(date: Date): string {
	if (isToday(date)) {
		return 'Today';
	}
	if (isYesterday(date)) {
		return 'Yesterday';
	}
	return format(date, 'MMM d, yyyy');
}

export function formatDateTime(date: Date): string {
	return format(date, 'MMM d, yyyy h:mm a');
}

export function formatDateFull(date: Date): string {
	return format(date, 'MMMM d, yyyy');
}

export function formatTimeAgo(date: Date): string {
	return formatDistanceToNow(date, { addSuffix: true });
}

export function getDaysBetween(start: Date, end: Date): number {
	return differenceInDays(end, start);
}

export function getHoursBetween(start: Date, end: Date): number {
	return differenceInHours(end, start);
}

export function hoursAgo(date: Date): number {
	return differenceInHours(new Date(), date);
}

export function isSameDayAs(date1: Date, date2: Date): boolean {
	return isSameDay(date1, date2);
}

export function getStartOfDay(date: Date): Date {
	return startOfDay(date);
}

export function getEndOfDay(date: Date): Date {
	return endOfDay(date);
}

export function getStartOfWeek(date: Date): Date {
	return startOfWeek(date, { weekStartsOn: 1 }); // Monday start
}

export function getEndOfWeek(date: Date): Date {
	return endOfWeek(date, { weekStartsOn: 1 });
}

export function addHoursToDate(date: Date, hours: number): Date {
	return addHours(date, hours);
}

export function formatDuration(days: number): string {
	if (days === 0) return 'Started today';
	if (days === 1) return '1 day';
	return `${days} days`;
}

export function getDateRangeLabel(start: Date, end: Date): string {
	const startStr = format(start, 'MMM d');
	const endStr = format(end, 'MMM d, yyyy');
	return `${startStr} - ${endStr}`;
}

export function formatInputDateTime(date: Date): string {
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function parseInputDateTime(value: string): Date {
	return new Date(value);
}
