import Dexie, { type Table } from 'dexie';
import type {
	UserSettings,
	TrackingSession,
	MetricDefinition,
	Entry,
	ScheduledReminder
} from '$types';
import { getBuiltInMetrics } from './schema';

export class SymptomTrackerDB extends Dexie {
	settings!: Table<UserSettings & { id: number }>;
	sessions!: Table<TrackingSession>;
	metrics!: Table<MetricDefinition>;
	entries!: Table<Entry>;
	reminders!: Table<ScheduledReminder>;

	constructor() {
		super('symptom-tracker');

		this.version(1).stores({
			settings: '++id',
			sessions: 'id, status, updatedAt',
			metrics: 'id, type, isBuiltIn',
			entries: 'id, sessionId, metricId, timestamp, [sessionId+timestamp], [sessionId+metricId+timestamp]',
			reminders: 'id, sessionId, scheduledFor, status'
		});

		// Seed built-in metrics on first open
		this.on('populate', () => {
			this.seedBuiltInMetrics();
		});
	}

	private async seedBuiltInMetrics() {
		const builtInMetrics = getBuiltInMetrics();
		await this.metrics.bulkAdd(builtInMetrics);
	}

	async getSettings(): Promise<UserSettings | undefined> {
		const result = await this.settings.toCollection().first();
		if (result) {
			const { id, ...settings } = result;
			return settings;
		}
		return undefined;
	}

	async saveSettings(settings: UserSettings): Promise<void> {
		const existing = await this.settings.toCollection().first();
		if (existing) {
			await this.settings.update(existing.id, settings);
		} else {
			await this.settings.add({ id: 1, ...settings });
		}
	}

	async getEntriesForSession(
		sessionId: string,
		options?: { startDate?: Date; endDate?: Date; metricId?: string }
	): Promise<Entry[]> {
		let collection = this.entries.where('sessionId').equals(sessionId);

		let entries = await collection.toArray();

		if (options?.startDate) {
			entries = entries.filter((e) => e.timestamp >= options.startDate!);
		}
		if (options?.endDate) {
			entries = entries.filter((e) => e.timestamp <= options.endDate!);
		}
		if (options?.metricId) {
			entries = entries.filter((e) => e.metricId === options.metricId);
		}

		return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	async getRecentEntries(sessionId: string, hours: number = 24): Promise<Entry[]> {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		const entries = await this.entries
			.where('sessionId')
			.equals(sessionId)
			.and((entry) => entry.timestamp >= cutoff)
			.toArray();

		return entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}
}

export const db = new SymptomTrackerDB();
