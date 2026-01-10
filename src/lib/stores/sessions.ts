import { writable, derived } from 'svelte/store';
import type { TrackingSession } from '$types';
import { db, DEFAULT_REMINDER_CONFIG } from '$db';
import { browser } from '$app/environment';
import { generateId } from '$utils';

function createSessionsStore() {
	const { subscribe, set, update } = writable<TrackingSession[]>([]);
	const activeSessionId = writable<string | null>(null);

	async function load() {
		if (!browser) return;
		try {
			const sessions = await db.sessions.orderBy('updatedAt').reverse().toArray();
			set(sessions);
		} catch (error) {
			console.error('Failed to load sessions:', error);
		}
	}

	async function create(
		data: Pick<TrackingSession, 'name' | 'description' | 'sessionType' | 'enabledMetrics'> &
			Partial<Pick<TrackingSession, 'reminderConfig'>>
	): Promise<TrackingSession> {
		const now = new Date();
		const session: TrackingSession = {
			id: generateId(),
			name: data.name,
			description: data.description,
			status: 'active',
			sessionType: data.sessionType,
			enabledMetrics: data.enabledMetrics,
			reminderConfig: data.reminderConfig ?? DEFAULT_REMINDER_CONFIG,
			createdAt: now,
			updatedAt: now
		};

		try {
			await db.sessions.add(session);
			update((sessions) => [session, ...sessions]);
			return session;
		} catch (error) {
			console.error('Failed to create session:', error);
			throw error;
		}
	}

	async function updateSession(id: string, data: Partial<TrackingSession>): Promise<void> {
		const updates = { ...data, updatedAt: new Date() };
		try {
			await db.sessions.update(id, updates);
			update((sessions) =>
				sessions.map((s) => (s.id === id ? { ...s, ...updates } : s))
			);
		} catch (error) {
			console.error('Failed to update session:', error);
			throw error;
		}
	}

	async function remove(id: string): Promise<void> {
		try {
			await db.transaction('rw', [db.sessions, db.entries], async () => {
				await db.entries.where('sessionId').equals(id).delete();
				await db.sessions.delete(id);
			});
			update((sessions) => sessions.filter((s) => s.id !== id));
		} catch (error) {
			console.error('Failed to delete session:', error);
			throw error;
		}
	}

	async function setStatus(
		id: string,
		status: TrackingSession['status']
	): Promise<void> {
		const updates: Partial<TrackingSession> = { status, updatedAt: new Date() };
		if (status === 'resolved') {
			updates.resolvedAt = new Date();
		}
		await updateSession(id, updates);
	}

	async function getById(id: string): Promise<TrackingSession | undefined> {
		if (!browser) return undefined;
		return db.sessions.get(id);
	}

	return {
		subscribe,
		load,
		create,
		update: updateSession,
		remove,
		setStatus,
		getById,
		activeSessionId: {
			subscribe: activeSessionId.subscribe,
			set: activeSessionId.set
		}
	};
}

export const sessions = createSessionsStore();

export const activeSessions = derived(sessions, ($sessions) =>
	$sessions.filter((s) => s.status === 'active')
);

export const resolvedSessions = derived(sessions, ($sessions) =>
	$sessions.filter((s) => s.status === 'resolved')
);
