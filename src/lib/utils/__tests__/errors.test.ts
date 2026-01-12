import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	AppError,
	handleStorageError,
	handleImportError,
	handleExportError,
	formatBytes,
	isStorageLow
} from '../errors';

// Mock navigator.storage.estimate
const mockEstimate = vi.fn();
Object.defineProperty(navigator, 'storage', {
	value: {
		estimate: mockEstimate
	},
	configurable: true
});

describe('AppError', () => {
	it('creates an error with correct properties', () => {
		const error = new AppError('STORAGE_ERROR', 'Test message');

		expect(error.type).toBe('STORAGE_ERROR');
		expect(error.message).toBe('Test message');
		expect(error.name).toBe('AppError');
		expect(error.recoverable).toBe(true);
	});

	it('accepts custom user message', () => {
		const error = new AppError('STORAGE_ERROR', 'Technical message', {
			userMessage: 'Custom user message'
		});

		expect(error.userMessage).toBe('Custom user message');
	});

	it('stores original error', () => {
		const originalError = new Error('Original');
		const error = new AppError('STORAGE_ERROR', 'Wrapped', {
			originalError
		});

		expect(error.originalError).toBe(originalError);
	});

	it('respects recoverable flag', () => {
		const error = new AppError('STORAGE_UNAVAILABLE', 'Not recoverable', {
			recoverable: false
		});

		expect(error.recoverable).toBe(false);
	});
});

describe('handleStorageError', () => {
	it('identifies quota exceeded errors', () => {
		const quotaError = new Error('QuotaExceededError: Storage quota exceeded');
		const appError = handleStorageError(quotaError);

		expect(appError.type).toBe('STORAGE_QUOTA_EXCEEDED');
		expect(appError.recoverable).toBe(true);
	});

	it('identifies IndexedDB unavailable errors', () => {
		const idbError = new Error('IndexedDB is blocked');
		const appError = handleStorageError(idbError);

		expect(appError.type).toBe('STORAGE_UNAVAILABLE');
		expect(appError.recoverable).toBe(false);
	});

	it('handles access denied errors', () => {
		const accessError = new Error('Access denied to IndexedDB');
		const appError = handleStorageError(accessError);

		expect(appError.type).toBe('STORAGE_UNAVAILABLE');
	});

	it('returns generic storage error for unknown errors', () => {
		const unknownError = new Error('Something went wrong');
		const appError = handleStorageError(unknownError);

		expect(appError.type).toBe('STORAGE_ERROR');
		expect(appError.recoverable).toBe(true);
	});

	it('handles non-Error objects', () => {
		const appError = handleStorageError('String error');

		expect(appError.type).toBe('STORAGE_ERROR');
		expect(appError.originalError).toBeInstanceOf(Error);
	});
});

describe('handleImportError', () => {
	it('identifies JSON parse errors', () => {
		const jsonError = new Error('Unexpected token in JSON');
		const appError = handleImportError(jsonError);

		expect(appError.type).toBe('IMPORT_ERROR');
		expect(appError.userMessage).toContain('invalid');
	});

	it('identifies validation errors', () => {
		const validationError = new Error('Missing required field');
		const appError = handleImportError(validationError);

		expect(appError.type).toBe('VALIDATION_ERROR');
	});

	it('handles syntax errors', () => {
		const syntaxError = new Error('Syntax error in file');
		const appError = handleImportError(syntaxError);

		expect(appError.type).toBe('IMPORT_ERROR');
	});

	it('returns generic import error for unknown errors', () => {
		const unknownError = new Error('Unknown import issue');
		const appError = handleImportError(unknownError);

		expect(appError.type).toBe('IMPORT_ERROR');
		expect(appError.recoverable).toBe(true);
	});
});

describe('handleExportError', () => {
	it('creates export error with user message', () => {
		const exportError = new Error('Failed to write file');
		const appError = handleExportError(exportError);

		expect(appError.type).toBe('EXPORT_ERROR');
		expect(appError.userMessage).toContain('export');
		expect(appError.recoverable).toBe(true);
	});
});

describe('formatBytes', () => {
	it('formats 0 bytes', () => {
		expect(formatBytes(0)).toBe('0 Bytes');
	});

	it('formats bytes', () => {
		expect(formatBytes(512)).toBe('512 Bytes');
	});

	it('formats kilobytes', () => {
		expect(formatBytes(1024)).toBe('1 KB');
		expect(formatBytes(1536)).toBe('1.5 KB');
	});

	it('formats megabytes', () => {
		expect(formatBytes(1048576)).toBe('1 MB');
		expect(formatBytes(5242880)).toBe('5 MB');
	});

	it('formats gigabytes', () => {
		expect(formatBytes(1073741824)).toBe('1 GB');
	});
});

describe('isStorageLow', () => {
	beforeEach(() => {
		mockEstimate.mockReset();
	});

	it('returns true when storage is over 80% used', async () => {
		mockEstimate.mockResolvedValue({
			usage: 90000,
			quota: 100000
		});

		const result = await isStorageLow();
		expect(result).toBe(true);
	});

	it('returns false when storage is under 80% used', async () => {
		mockEstimate.mockResolvedValue({
			usage: 50000,
			quota: 100000
		});

		const result = await isStorageLow();
		expect(result).toBe(false);
	});

	it('returns false when estimate fails', async () => {
		mockEstimate.mockRejectedValue(new Error('Not supported'));

		const result = await isStorageLow();
		expect(result).toBe(false);
	});
});
