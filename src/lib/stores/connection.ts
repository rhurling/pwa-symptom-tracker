import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface ConnectionState {
	online: boolean;
	lastOnline: Date | null;
	lastOffline: Date | null;
}

function createConnectionStore() {
	const { subscribe, set, update } = writable<ConnectionState>({
		online: browser ? navigator.onLine : true,
		lastOnline: null,
		lastOffline: null
	});

	if (browser) {
		// Set up event listeners for online/offline events
		window.addEventListener('online', () => {
			update((state) => ({
				...state,
				online: true,
				lastOnline: new Date()
			}));
		});

		window.addEventListener('offline', () => {
			update((state) => ({
				...state,
				online: false,
				lastOffline: new Date()
			}));
		});
	}

	return {
		subscribe,

		// Check current connection status
		check(): boolean {
			return browser ? navigator.onLine : true;
		},

		// Manually trigger a status update
		refresh() {
			if (browser) {
				update((state) => ({
					...state,
					online: navigator.onLine
				}));
			}
		}
	};
}

export const connection = createConnectionStore();

// Derived store for simple online/offline boolean
export const isOnline = derived(connection, ($connection) => $connection.online);

// Derived store for offline duration
export const offlineDuration = derived(connection, ($connection) => {
	if ($connection.online || !$connection.lastOffline) {
		return null;
	}
	return Date.now() - $connection.lastOffline.getTime();
});
