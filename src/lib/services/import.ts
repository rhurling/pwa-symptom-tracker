import type { ExportData, ImportResult, TrackingSession, Entry, MetricDefinition, UserSettings } from '$types';
import { db } from '$db';

// Validation result interface
export interface ImportValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	data?: ExportData;
}

// Duplicate info interface
export interface DuplicateInfo {
	duplicateSessions: string[];
	duplicateEntries: string[];
	duplicateMetrics: string[];
}

// Validate and parse import data
export function validateImportData(rawData: unknown): ImportValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Basic structure validation
	if (!rawData || typeof rawData !== 'object') {
		return { isValid: false, errors: ['Invalid export file format'], warnings };
	}

	const exportData = rawData as Record<string, unknown>;

	if (!exportData.exportVersion || typeof exportData.exportVersion !== 'string') {
		errors.push('Missing or invalid export version');
	}

	if (!exportData.data || typeof exportData.data !== 'object') {
		errors.push('Missing data section in export file');
		return { isValid: false, errors, warnings };
	}

	const innerData = exportData.data as Record<string, unknown>;

	// Validate sessions
	if (innerData.sessions) {
		if (!Array.isArray(innerData.sessions)) {
			errors.push('Sessions must be an array');
		} else {
			for (let i = 0; i < innerData.sessions.length; i++) {
				const session = innerData.sessions[i];
				if (!session.id || typeof session.id !== 'string') {
					errors.push(`Session ${i + 1}: missing id`);
				}
				if (!session.name || typeof session.name !== 'string') {
					errors.push(`Session ${i + 1}: missing name`);
				}
				if (!['active', 'paused', 'resolved'].includes(session.status)) {
					errors.push(`Session ${i + 1}: invalid status "${session.status}"`);
				}
			}
		}
	}

	// Validate entries
	if (innerData.entries) {
		if (!Array.isArray(innerData.entries)) {
			errors.push('Entries must be an array');
		} else {
			for (let i = 0; i < innerData.entries.length; i++) {
				const entry = innerData.entries[i];
				if (!entry.id || typeof entry.id !== 'string') {
					errors.push(`Entry ${i + 1}: missing id`);
				}
				if (!entry.sessionId || typeof entry.sessionId !== 'string') {
					errors.push(`Entry ${i + 1}: missing sessionId`);
				}
				if (!entry.metricId || typeof entry.metricId !== 'string') {
					errors.push(`Entry ${i + 1}: missing metricId`);
				}
				if (!entry.value || typeof entry.value !== 'object') {
					errors.push(`Entry ${i + 1}: missing or invalid value`);
				}
			}
		}
	}

	// Validate custom metrics
	if (innerData.customMetrics) {
		if (!Array.isArray(innerData.customMetrics)) {
			errors.push('Custom metrics must be an array');
		} else {
			for (let i = 0; i < innerData.customMetrics.length; i++) {
				const metric = innerData.customMetrics[i];
				if (!metric.id || typeof metric.id !== 'string') {
					errors.push(`Metric ${i + 1}: missing id`);
				}
				if (!metric.name || typeof metric.name !== 'string') {
					errors.push(`Metric ${i + 1}: missing name`);
				}
			}
		}
	}

	if (errors.length > 0) {
		return { isValid: false, errors, warnings };
	}

	// Parse and convert dates
	const parsedData = parseImportData(rawData as ExportData);
	return { isValid: true, errors: [], warnings, data: parsedData };
}

// Parse import data and convert date strings to Date objects
function parseImportData(rawData: ExportData): ExportData {
	const data = JSON.parse(JSON.stringify(rawData)) as ExportData;

	// Parse sessions
	if (data.data.sessions) {
		for (const session of data.data.sessions) {
			if (session.createdAt) session.createdAt = new Date(session.createdAt);
			if (session.updatedAt) session.updatedAt = new Date(session.updatedAt);
			if (session.resolvedAt) session.resolvedAt = new Date(session.resolvedAt);
		}
	}

	// Parse entries
	if (data.data.entries) {
		for (const entry of data.data.entries) {
			if (entry.timestamp) entry.timestamp = new Date(entry.timestamp);
			if (entry.createdAt) entry.createdAt = new Date(entry.createdAt);
			if (entry.updatedAt) entry.updatedAt = new Date(entry.updatedAt);
		}
	}

	// Parse custom metrics
	if (data.data.customMetrics) {
		for (const metric of data.data.customMetrics) {
			if (metric.createdAt) metric.createdAt = new Date(metric.createdAt);
		}
	}

	// Parse settings
	if (data.data.settings) {
		if (data.data.settings.createdAt) data.data.settings.createdAt = new Date(data.data.settings.createdAt);
		if (data.data.settings.updatedAt) data.data.settings.updatedAt = new Date(data.data.settings.updatedAt);
	}

	return data;
}

// Check for duplicates
export async function checkDuplicates(data: ExportData): Promise<DuplicateInfo> {
	const duplicateSessions: string[] = [];
	const duplicateEntries: string[] = [];
	const duplicateMetrics: string[] = [];

	// Check sessions
	if (data.data.sessions) {
		for (const session of data.data.sessions) {
			const existing = await db.sessions.get(session.id);
			if (existing) {
				duplicateSessions.push(session.id);
			}
		}
	}

	// Check entries
	if (data.data.entries) {
		for (const entry of data.data.entries) {
			const existing = await db.entries.get(entry.id);
			if (existing) {
				duplicateEntries.push(entry.id);
			}
		}
	}

	// Check metrics
	if (data.data.customMetrics) {
		for (const metric of data.data.customMetrics) {
			const existing = await db.metrics.get(metric.id);
			if (existing) {
				duplicateMetrics.push(metric.id);
			}
		}
	}

	return { duplicateSessions, duplicateEntries, duplicateMetrics };
}

// Import strategy type
export type ImportStrategy = 'skip' | 'overwrite' | 'merge';

// Import data with strategy
export async function importData(
	data: ExportData,
	strategy: ImportStrategy = 'overwrite',
	importSettings: boolean = true
): Promise<ImportResult> {
	const errors: string[] = [];
	const warnings: string[] = [];
	const stats = {
		sessionsImported: 0,
		entriesImported: 0,
		metricsImported: 0,
		duplicatesSkipped: 0
	};

	try {
		// Get duplicates info
		const duplicates = await checkDuplicates(data);

		// Import sessions
		if (data.data.sessions?.length > 0) {
			const sessionsToImport = data.data.sessions.filter((s) => {
				if (strategy === 'skip' && duplicates.duplicateSessions.includes(s.id)) {
					stats.duplicatesSkipped++;
					return false;
				}
				return true;
			});

			if (sessionsToImport.length > 0) {
				await db.sessions.bulkPut(sessionsToImport);
				stats.sessionsImported = sessionsToImport.length;
			}
		}

		// Import entries
		if (data.data.entries?.length > 0) {
			const entriesToImport = data.data.entries.filter((e) => {
				if (strategy === 'skip' && duplicates.duplicateEntries.includes(e.id)) {
					stats.duplicatesSkipped++;
					return false;
				}
				return true;
			});

			if (entriesToImport.length > 0) {
				await db.entries.bulkPut(entriesToImport);
				stats.entriesImported = entriesToImport.length;
			}
		}

		// Import custom metrics
		if (data.data.customMetrics?.length > 0) {
			const metricsToImport = data.data.customMetrics.filter((m) => {
				if (strategy === 'skip' && duplicates.duplicateMetrics.includes(m.id)) {
					stats.duplicatesSkipped++;
					return false;
				}
				return true;
			});

			if (metricsToImport.length > 0) {
				await db.metrics.bulkPut(metricsToImport);
				stats.metricsImported = metricsToImport.length;
			}
		}

		// Import settings
		if (importSettings && data.data.settings) {
			await db.saveSettings(data.data.settings);
		}

		return { success: true, errors, warnings, stats };
	} catch (error) {
		console.error('Import failed:', error);
		errors.push(error instanceof Error ? error.message : 'Unknown error during import');
		return { success: false, errors, warnings, stats };
	}
}

// Import from file
export async function importFromFile(file: File, strategy: ImportStrategy = 'overwrite'): Promise<ImportResult> {
	try {
		const text = await file.text();
		const rawData = JSON.parse(text);
		const validation = validateImportData(rawData);

		if (!validation.isValid || !validation.data) {
			return {
				success: false,
				errors: validation.errors,
				warnings: validation.warnings,
				stats: { sessionsImported: 0, entriesImported: 0, metricsImported: 0, duplicatesSkipped: 0 }
			};
		}

		return await importData(validation.data, strategy);
	} catch (error) {
		console.error('Import from file failed:', error);
		return {
			success: false,
			errors: [error instanceof Error ? error.message : 'Failed to read or parse file'],
			warnings: [],
			stats: { sessionsImported: 0, entriesImported: 0, metricsImported: 0, duplicatesSkipped: 0 }
		};
	}
}

// Clear all data
export async function clearAllData(): Promise<void> {
	await db.entries.clear();
	await db.sessions.clear();
	await db.metrics.filter((m) => !m.isBuiltIn).delete();
}
