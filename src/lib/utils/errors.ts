/**
 * Application Error Types
 */
export type AppErrorType =
	| 'STORAGE_ERROR'
	| 'STORAGE_QUOTA_EXCEEDED'
	| 'STORAGE_UNAVAILABLE'
	| 'IMPORT_ERROR'
	| 'EXPORT_ERROR'
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'UNKNOWN_ERROR';

/**
 * Application Error class with user-friendly messages
 */
export class AppError extends Error {
	type: AppErrorType;
	userMessage: string;
	originalError?: Error;
	recoverable: boolean;

	constructor(
		type: AppErrorType,
		message: string,
		options?: {
			userMessage?: string;
			originalError?: Error;
			recoverable?: boolean;
		}
	) {
		super(message);
		this.name = 'AppError';
		this.type = type;
		this.userMessage = options?.userMessage ?? getUserFriendlyMessage(type);
		this.originalError = options?.originalError;
		this.recoverable = options?.recoverable ?? true;
	}
}

/**
 * Get user-friendly message for error type
 */
function getUserFriendlyMessage(type: AppErrorType): string {
	switch (type) {
		case 'STORAGE_ERROR':
			return 'There was a problem saving your data. Please try again.';
		case 'STORAGE_QUOTA_EXCEEDED':
			return 'Your device is running low on storage. Consider exporting and clearing old data.';
		case 'STORAGE_UNAVAILABLE':
			return 'Storage is not available. This may happen in private browsing mode.';
		case 'IMPORT_ERROR':
			return 'There was a problem importing your data. Please check the file format.';
		case 'EXPORT_ERROR':
			return 'There was a problem exporting your data. Please try again.';
		case 'VALIDATION_ERROR':
			return 'Some data appears to be invalid. Please check your input.';
		case 'NETWORK_ERROR':
			return 'Network connection issue. Your data is saved locally and will sync when online.';
		case 'UNKNOWN_ERROR':
		default:
			return 'Something went wrong. Please try again.';
	}
}

/**
 * Handle storage errors and convert to AppError
 */
export function handleStorageError(error: unknown): AppError {
	const originalError = error instanceof Error ? error : new Error(String(error));
	const message = originalError.message.toLowerCase();

	// Check for quota exceeded
	if (
		message.includes('quota') ||
		message.includes('storage') ||
		originalError.name === 'QuotaExceededError'
	) {
		return new AppError('STORAGE_QUOTA_EXCEEDED', 'Storage quota exceeded', {
			originalError,
			userMessage: 'Your device storage is full. Export your data and clear old sessions to free up space.',
			recoverable: true
		});
	}

	// Check for IndexedDB unavailable
	if (
		message.includes('indexeddb') ||
		message.includes('idb') ||
		message.includes('blocked') ||
		message.includes('access denied')
	) {
		return new AppError('STORAGE_UNAVAILABLE', 'IndexedDB unavailable', {
			originalError,
			userMessage: 'Storage is not available. This app requires storage access to work. Try disabling private browsing mode.',
			recoverable: false
		});
	}

	// Generic storage error
	return new AppError('STORAGE_ERROR', originalError.message, {
		originalError,
		recoverable: true
	});
}

/**
 * Handle import errors and convert to AppError
 */
export function handleImportError(error: unknown): AppError {
	const originalError = error instanceof Error ? error : new Error(String(error));
	const message = originalError.message.toLowerCase();

	// Check for JSON parse errors
	if (message.includes('json') || message.includes('parse') || message.includes('syntax')) {
		return new AppError('IMPORT_ERROR', 'Invalid JSON format', {
			originalError,
			userMessage: 'The file format is invalid. Please ensure you are importing a valid backup file.',
			recoverable: true
		});
	}

	// Check for validation errors
	if (message.includes('invalid') || message.includes('missing') || message.includes('required')) {
		return new AppError('VALIDATION_ERROR', originalError.message, {
			originalError,
			userMessage: `Import failed: ${originalError.message}`,
			recoverable: true
		});
	}

	// Generic import error
	return new AppError('IMPORT_ERROR', originalError.message, {
		originalError,
		recoverable: true
	});
}

/**
 * Handle export errors and convert to AppError
 */
export function handleExportError(error: unknown): AppError {
	const originalError = error instanceof Error ? error : new Error(String(error));

	return new AppError('EXPORT_ERROR', originalError.message, {
		originalError,
		userMessage: 'Failed to export data. Please try again.',
		recoverable: true
	});
}

/**
 * Check if storage is available
 */
export async function checkStorageAvailability(): Promise<{
	available: boolean;
	error?: AppError;
}> {
	try {
		// Try to open IndexedDB
		const testDb = indexedDB.open('__storage_test__');

		return new Promise((resolve) => {
			testDb.onerror = () => {
				resolve({
					available: false,
					error: new AppError('STORAGE_UNAVAILABLE', 'IndexedDB not available', {
						userMessage: 'Storage is not available in this browser mode.',
						recoverable: false
					})
				});
			};

			testDb.onsuccess = () => {
				// Clean up test database
				testDb.result.close();
				indexedDB.deleteDatabase('__storage_test__');
				resolve({ available: true });
			};
		});
	} catch (error) {
		return {
			available: false,
			error: handleStorageError(error)
		};
	}
}

/**
 * Estimate storage usage (if available)
 */
export async function getStorageEstimate(): Promise<{
	usage: number;
	quota: number;
	percentUsed: number;
} | null> {
	if (!navigator.storage?.estimate) {
		return null;
	}

	try {
		const estimate = await navigator.storage.estimate();
		const usage = estimate.usage ?? 0;
		const quota = estimate.quota ?? 0;
		const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

		return { usage, quota, percentUsed };
	} catch {
		return null;
	}
}

/**
 * Check if storage is running low (>80% used)
 */
export async function isStorageLow(): Promise<boolean> {
	const estimate = await getStorageEstimate();
	if (!estimate) return false;
	return estimate.percentUsed > 80;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Log error for debugging (console in dev, could be sent to service in prod)
 */
export function logError(error: AppError | Error, context?: string): void {
	const timestamp = new Date().toISOString();
	const errorInfo = error instanceof AppError
		? {
			type: error.type,
			message: error.message,
			userMessage: error.userMessage,
			recoverable: error.recoverable,
			originalError: error.originalError?.message
		}
		: {
			message: error.message,
			stack: error.stack
		};

	console.error(`[${timestamp}]${context ? ` [${context}]` : ''}`, errorInfo);
}
