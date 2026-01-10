import { writable, derived, get } from 'svelte/store';
import { db } from '$db';
import type { ScheduledReminder } from '$types';

// Reminder store state
interface ReminderState {
	reminders: ScheduledReminder[];
	loading: boolean;
}

function createRemindersStore() {
	const { subscribe, set, update } = writable<ReminderState>({
		reminders: [],
		loading: false
	});

	return {
		subscribe,

		// Load all reminders
		async load() {
			update((s) => ({ ...s, loading: true }));
			try {
				const reminders = await db.reminders.toArray();
				set({ reminders, loading: false });
			} catch (error) {
				console.error('Failed to load reminders:', error);
				set({ reminders: [], loading: false });
			}
		},

		// Load reminders for a specific session
		async loadForSession(sessionId: string) {
			update((s) => ({ ...s, loading: true }));
			try {
				const reminders = await db.reminders.where('sessionId').equals(sessionId).toArray();
				set({ reminders, loading: false });
			} catch (error) {
				console.error('Failed to load reminders:', error);
				set({ reminders: [], loading: false });
			}
		},

		// Create a new reminder
		async create(reminder: Omit<ScheduledReminder, 'id' | 'createdAt'>) {
			const now = new Date();
			const newReminder: ScheduledReminder = {
				...reminder,
				id: `reminder-${Date.now()}`,
				createdAt: now
			};

			await db.reminders.add(newReminder);
			update((s) => ({
				...s,
				reminders: [...s.reminders, newReminder]
			}));

			return newReminder;
		},

		// Update a reminder
		async update(id: string, updates: Partial<ScheduledReminder>) {
			await db.reminders.update(id, updates);
			update((s) => ({
				...s,
				reminders: s.reminders.map((r) =>
					r.id === id ? { ...r, ...updates } : r
				)
			}));
		},

		// Delete a reminder
		async remove(id: string) {
			await db.reminders.delete(id);
			update((s) => ({
				...s,
				reminders: s.reminders.filter((r) => r.id !== id)
			}));
		},

		// Snooze a reminder
		async snooze(id: string, minutes: number) {
			const snoozeUntil = new Date();
			snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);

			await db.reminders.update(id, { snoozedUntil: snoozeUntil });
			update((s) => ({
				...s,
				reminders: s.reminders.map((r) =>
					r.id === id ? { ...r, snoozedUntil: snoozeUntil } : r
				)
			}));
		},

		// Mark a reminder as completed
		async complete(id: string) {
			await this.remove(id);
		},

		// Clear all reminders for a session
		async clearForSession(sessionId: string) {
			await db.reminders.where('sessionId').equals(sessionId).delete();
			update((s) => ({
				...s,
				reminders: s.reminders.filter((r) => r.sessionId !== sessionId)
			}));
		},

		// Get active reminders (not snoozed)
		getActive(): ScheduledReminder[] {
			const state = get({ subscribe });
			const now = new Date();
			return state.reminders.filter((r) => {
				if (r.snoozedUntil && r.snoozedUntil > now) {
					return false;
				}
				if (r.scheduledFor > now) {
					return false;
				}
				return true;
			});
		},

		// Get upcoming reminders
		getUpcoming(): ScheduledReminder[] {
			const state = get({ subscribe });
			const now = new Date();
			return state.reminders
				.filter((r) => r.scheduledFor > now)
				.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
		}
	};
}

export const reminders = createRemindersStore();

// Derived store for active reminders count
export const activeRemindersCount = derived(
	{ subscribe: reminders.subscribe },
	($state) => {
		const now = new Date();
		return $state.reminders.filter((r) => {
			if (r.snoozedUntil && r.snoozedUntil > now) {
				return false;
			}
			if (r.scheduledFor > now) {
				return false;
			}
			return true;
		}).length;
	}
);
