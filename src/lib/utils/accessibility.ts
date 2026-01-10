/**
 * Accessibility utilities for the application
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const focusableSelectors = [
		'button:not([disabled])',
		'[href]',
		'input:not([disabled])',
		'select:not([disabled])',
		'textarea:not([disabled])',
		'[tabindex]:not([tabindex="-1"])'
	].join(',');

	return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Create a focus trap within a container
 * Returns a cleanup function to remove the trap
 */
export function createFocusTrap(container: HTMLElement): () => void {
	const focusableElements = getFocusableElements(container);

	if (focusableElements.length === 0) {
		return () => {};
	}

	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	// Store the previously focused element to restore later
	const previouslyFocused = document.activeElement as HTMLElement | null;

	// Focus the first focusable element
	firstElement?.focus();

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const focusable = getFocusableElements(container);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey) {
			// Shift + Tab: moving backwards
			if (document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			}
		} else {
			// Tab: moving forwards
			if (document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		}
	}

	container.addEventListener('keydown', handleKeyDown);

	// Return cleanup function
	return () => {
		container.removeEventListener('keydown', handleKeyDown);
		// Restore focus to previously focused element
		previouslyFocused?.focus();
	};
}

/**
 * Announce a message to screen readers using a live region
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
	// Find or create the live region
	let liveRegion = document.getElementById('sr-live-region');

	if (!liveRegion) {
		liveRegion = document.createElement('div');
		liveRegion.id = 'sr-live-region';
		liveRegion.setAttribute('aria-live', priority);
		liveRegion.setAttribute('aria-atomic', 'true');
		liveRegion.className = 'sr-only';
		liveRegion.style.cssText =
			'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
		document.body.appendChild(liveRegion);
	}

	// Update the priority if needed
	liveRegion.setAttribute('aria-live', priority);

	// Clear and set the message (this triggers the announcement)
	liveRegion.textContent = '';
	// Use a small timeout to ensure the change is detected
	setTimeout(() => {
		liveRegion!.textContent = message;
	}, 100);
}

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Generate a unique ID for ARIA attributes
 */
export function generateAriaId(prefix: string = 'aria'): string {
	return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Skip link target IDs for main content areas
 */
export const skipLinkTargets = {
	main: 'main-content',
	navigation: 'main-navigation',
	sessions: 'sessions-list'
} as const;
