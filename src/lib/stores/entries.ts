import { writable, derived, get } from 'svelte/store';
import type { Entry, EntryValue } from '$types';
import { db } from '$db';
import { browser } from '$app/environment';
import { generateId } from '$utils';

function createEntriesStore() {
	const { subscribe, set, update } = writable<Entry[]>([]);
	const currentSessionId = writable<string | null>(null);

	async function loadForSession(sessionId: string) {
		if (!browser) return;
		currentSessionId.set(sessionId);
		try {
			const entries = await db.getEntriesForSession(sessionId);
			set(entries);
		} catch (error) {
			console.error('Failed to load entries:', error);
		}
	}

	async function create(
		sessionId: string,
		metricId: string,
		value: EntryValue,
		options?: { timestamp?: Date; note?: string; isRetrospective?: boolean }
	): Promise<Entry> {
		const now = new Date();
		const entry: Entry = {
			id: generateId(),
			sessionId,
			metricId,
			timestamp: options?.timestamp ?? now,
			value,
			note: options?.note,
			isRetrospective: options?.isRetrospective ?? (options?.timestamp ? true : false),
			createdAt: now,
			updatedAt: now
		};

		try {
			await db.entries.add(entry);
			// Only update the store if we're viewing this session
			if (get(currentSessionId) === sessionId) {
				update((entries) => [entry, ...entries].sort(
					(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
				));
			}
			// Update session's updatedAt
			await db.sessions.update(sessionId, { updatedAt: now });
			return entry;
		} catch (error) {
			console.error('Failed to create entry:', error);
			throw error;
		}
	}

	async function createMultiple(
		sessionId: string,
		entries: Array<{ metricId: string; value: EntryValue; note?: string }>,
		options?: { timestamp?: Date; isRetrospective?: boolean }
	): Promise<Entry[]> {
		const now = new Date();
		const timestamp = options?.timestamp ?? now;
		const isRetrospective = options?.isRetrospective ?? (options?.timestamp ? true : false);

		const newEntries: Entry[] = entries.map(({ metricId, value, note }) => ({
			id: generateId(),
			sessionId,
			metricId,
			timestamp,
			value,
			note,
			isRetrospective,
			createdAt: now,
			updatedAt: now
		}));

		try {
			await db.entries.bulkAdd(newEntries);
			// Only update the store if we're viewing this session
			if (get(currentSessionId) === sessionId) {
				update((current) =>
					[...newEntries, ...current].sort(
						(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
					)
				);
			}
			// Update session's updatedAt
			await db.sessions.update(sessionId, { updatedAt: now });
			return newEntries;
		} catch (error) {
			console.error('Failed to create entries:', error);
			throw error;
		}
	}

	async function updateEntry(id: string, data: Partial<Entry>): Promise<void> {
		const updates = { ...data, updatedAt: new Date() };
		try {
			await db.entries.update(id, updates);
			update((entries) =>
				entries.map((e) => (e.id === id ? { ...e, ...updates } : e))
			);
		} catch (error) {
			console.error('Failed to update entry:', error);
			throw error;
		}
	}

	async function remove(id: string): Promise<void> {
		try {
			await db.entries.delete(id);
			update((entries) => entries.filter((e) => e.id !== id));
		} catch (error) {
			console.error('Failed to delete entry:', error);
			throw error;
		}
	}

	async function getRecentForSession(sessionId: string, hours: number = 24): Promise<Entry[]> {
		if (!browser) return [];
		return db.getRecentEntries(sessionId, hours);
	}

	function clear() {
		set([]);
		currentSessionId.set(null);
	}

	return {
		subscribe,
		loadForSession,
		create,
		createMultiple,
		update: updateEntry,
		remove,
		getRecentForSession,
		clear,
		currentSessionId: { subscribe: currentSessionId.subscribe }
	};
}

export const entries = createEntriesStore();

export const entriesByMetric = derived(entries, ($entries) => {
	const byMetric = new Map<string, Entry[]>();
	for (const entry of $entries) {
		if (!byMetric.has(entry.metricId)) {
			byMetric.set(entry.metricId, []);
		}
		byMetric.get(entry.metricId)!.push(entry);
	}
	return byMetric;
});

export const latestEntryByMetric = derived(entriesByMetric, ($byMetric) => {
	const latest = new Map<string, Entry>();
	for (const [metricId, entries] of $byMetric) {
		if (entries.length > 0) {
			latest.set(metricId, entries[0]); // Already sorted by timestamp desc
		}
	}
	return latest;
});
