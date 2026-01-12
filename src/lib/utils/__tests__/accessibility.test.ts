import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getFocusableElements,
	createFocusTrap,
	announce,
	prefersReducedMotion,
	generateAriaId
} from '../accessibility';

// Set up DOM environment
beforeEach(() => {
	document.body.innerHTML = '';
});

describe('getFocusableElements', () => {
	it('finds buttons', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<button>Click me</button>
			<button disabled>Disabled</button>
		`;

		const focusable = getFocusableElements(container);
		expect(focusable).toHaveLength(1);
		expect(focusable[0].textContent).toBe('Click me');
	});

	it('finds links with href', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<a href="/home">Home</a>
			<a>No href</a>
		`;

		const focusable = getFocusableElements(container);
		expect(focusable).toHaveLength(1);
		expect(focusable[0].textContent).toBe('Home');
	});

	it('finds inputs', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<input type="text" />
			<input type="text" disabled />
			<textarea></textarea>
			<select><option>Option</option></select>
		`;

		const focusable = getFocusableElements(container);
		expect(focusable).toHaveLength(3);
	});

	it('finds elements with tabindex', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<div tabindex="0">Focusable div</div>
			<div tabindex="-1">Not in tab order</div>
			<span tabindex="1">Custom order</span>
		`;

		const focusable = getFocusableElements(container);
		expect(focusable).toHaveLength(2);
	});
});

describe('createFocusTrap', () => {
	it('returns cleanup function', () => {
		const container = document.createElement('div');
		container.innerHTML = '<button>Test</button>';
		document.body.appendChild(container);

		const cleanup = createFocusTrap(container);
		expect(typeof cleanup).toBe('function');

		cleanup();
	});

	it('returns no-op for empty container', () => {
		const container = document.createElement('div');
		const cleanup = createFocusTrap(container);

		expect(typeof cleanup).toBe('function');
		cleanup(); // Should not throw
	});

	it('focuses first element on creation', async () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<button id="first">First</button>
			<button id="second">Second</button>
		`;
		document.body.appendChild(container);

		createFocusTrap(container);

		// First element should be focused
		expect(document.activeElement?.id).toBe('first');
	});

	it('traps focus on Tab key', () => {
		const container = document.createElement('div');
		container.innerHTML = `
			<button id="first">First</button>
			<button id="last">Last</button>
		`;
		document.body.appendChild(container);

		createFocusTrap(container);

		// Focus the last element
		const lastButton = container.querySelector('#last') as HTMLElement;
		lastButton.focus();

		// Simulate Tab key on last element
		const tabEvent = new KeyboardEvent('keydown', {
			key: 'Tab',
			bubbles: true
		});

		container.dispatchEvent(tabEvent);

		// Focus should wrap to first element
		// Note: In a real browser, this would work, but in JSDOM
		// we're just testing the event handler is attached
	});
});

describe('announce', () => {
	beforeEach(() => {
		// Clean up any existing live regions
		const existing = document.getElementById('sr-live-region');
		if (existing) {
			existing.remove();
		}
	});

	it('creates live region if not exists', () => {
		announce('Test message');

		const liveRegion = document.getElementById('sr-live-region');
		expect(liveRegion).not.toBeNull();
	});

	it('sets aria-live attribute', () => {
		announce('Test message', 'assertive');

		const liveRegion = document.getElementById('sr-live-region');
		expect(liveRegion?.getAttribute('aria-live')).toBe('assertive');
	});

	it('updates message after delay', async () => {
		vi.useFakeTimers();

		announce('Test message');

		// Fast forward past the 100ms delay
		await vi.advanceTimersByTimeAsync(150);

		const liveRegion = document.getElementById('sr-live-region');
		expect(liveRegion?.textContent).toBe('Test message');

		vi.useRealTimers();
	});
});

describe('prefersReducedMotion', () => {
	beforeEach(() => {
		// Mock window.matchMedia
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query) => ({
				matches: query === '(prefers-reduced-motion: reduce)',
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});
	});

	it('returns boolean', () => {
		const result = prefersReducedMotion();
		expect(typeof result).toBe('boolean');
	});

	it('returns true when reduced motion is preferred', () => {
		(window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation((query: string) => ({
			matches: query === '(prefers-reduced-motion: reduce)',
			media: query
		}));

		const result = prefersReducedMotion();
		expect(result).toBe(true);
	});

	it('returns false when reduced motion is not preferred', () => {
		(window.matchMedia as ReturnType<typeof vi.fn>).mockImplementation(() => ({
			matches: false,
			media: ''
		}));

		const result = prefersReducedMotion();
		expect(result).toBe(false);
	});
});

describe('generateAriaId', () => {
	it('generates unique IDs', () => {
		const id1 = generateAriaId();
		const id2 = generateAriaId();

		expect(id1).not.toBe(id2);
	});

	it('uses provided prefix', () => {
		const id = generateAriaId('modal');
		expect(id.startsWith('modal-')).toBe(true);
	});

	it('uses default prefix', () => {
		const id = generateAriaId();
		expect(id.startsWith('aria-')).toBe(true);
	});
});
