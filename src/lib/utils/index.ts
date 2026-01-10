export * from './temperature';
export * from './dates';
export * from './grouping';

export function generateId(): string {
	return crypto.randomUUID();
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
