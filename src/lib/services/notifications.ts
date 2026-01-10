import type { TrackingSession, Entry, ReminderConfig } from '$types';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Check if notifications are supported in the current browser
 */
export function isNotificationSupported(): boolean {
	return 'Notification' in window;
}

/**
 * Get the current notification permission state
 */
export function getNotificationPermission(): NotificationPermissionState {
	if (!isNotificationSupported()) {
		return 'unsupported';
	}
	return Notification.permission as NotificationPermissionState;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
	if (!isNotificationSupported()) {
		return 'unsupported';
	}

	try {
		const permission = await Notification.requestPermission();
		return permission as NotificationPermissionState;
	} catch (error) {
		console.error('Failed to request notification permission:', error);
		return 'denied';
	}
}

/**
 * Show a notification
 */
export async function showNotification(
	title: string,
	options?: NotificationOptions
): Promise<Notification | null> {
	if (!isNotificationSupported()) {
		console.warn('Notifications not supported');
		return null;
	}

	if (Notification.permission !== 'granted') {
		console.warn('Notification permission not granted');
		return null;
	}

	try {
		// Use service worker for better PWA support if available
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			const registration = await navigator.serviceWorker.ready;
			await registration.showNotification(title, {
				icon: '/icon-192.png',
				badge: '/icon-192.png',
				...options
			});
			return null; // Service worker notifications don't return a Notification object
		}

		// Fall back to regular notification
		return new Notification(title, {
			icon: '/icon-192.png',
			...options
		});
	} catch (error) {
		console.error('Failed to show notification:', error);
		return null;
	}
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<boolean> {
	const notification = await showNotification('Test Notification', {
		body: 'Notifications are working correctly!',
		tag: 'test-notification'
	});

	return notification !== null || Notification.permission === 'granted';
}

/**
 * Calculate the next reminder time based on session config and recent entries
 */
export function calculateNextReminder(
	session: TrackingSession,
	recentEntries: Entry[],
	config: ReminderConfig
): Date | null {
	if (!config.enabled) {
		return null;
	}

	const now = new Date();
	const lastEntry = recentEntries[0]; // Assume sorted by timestamp desc

	if (config.mode === 'scheduled' && config.scheduledTimes?.length) {
		// Find the next scheduled time
		const todayScheduled = config.scheduledTimes.map((time) => {
			const [hours, minutes] = time.split(':').map(Number);
			const scheduled = new Date(now);
			scheduled.setHours(hours, minutes, 0, 0);
			return scheduled;
		});

		// Find the next upcoming scheduled time
		const nextTime = todayScheduled.find((t) => t > now);
		if (nextTime) {
			return nextTime;
		}

		// If all today's times have passed, return first time tomorrow
		const tomorrowFirst = new Date(todayScheduled[0]);
		tomorrowFirst.setDate(tomorrowFirst.getDate() + 1);
		return tomorrowFirst;
	}

	if (config.mode === 'smart' && config.smartConfig) {
		// Smart reminders based on symptom severity
		const intervalHours = determineSmartInterval(session, recentEntries, config.smartConfig);
		const lastEntryTime = lastEntry?.timestamp ?? session.createdAt;

		const nextReminder = new Date(lastEntryTime);
		nextReminder.setHours(nextReminder.getHours() + intervalHours);

		// If the calculated time is in the past, set it to now + interval
		if (nextReminder <= now) {
			const adjusted = new Date(now);
			adjusted.setHours(adjusted.getHours() + intervalHours);
			return adjusted;
		}

		return nextReminder;
	}

	return null;
}

/**
 * Determine the smart reminder interval based on recent entries
 */
function determineSmartInterval(
	session: TrackingSession,
	recentEntries: Entry[],
	smartConfig: NonNullable<ReminderConfig['smartConfig']>
): number {
	// Check if there are recent concerning entries (e.g., fever)
	const last24Hours = recentEntries.filter((e) => {
		const hoursDiff = (Date.now() - e.timestamp.getTime()) / (1000 * 60 * 60);
		return hoursDiff <= 24;
	});

	// Check for fever or concerning values
	const hasFever = last24Hours.some((e) => {
		if (e.value.type === 'temperature') {
			return e.value.celsius >= 37.8; // Fever threshold
		}
		return false;
	});

	// Check for poor feeling
	const hasLowFeeling = last24Hours.some((e) => {
		if (e.value.type === 'feeling') {
			return e.value.emojiValue <= 2; // Poor or Terrible
		}
		return false;
	});

	// Determine interval based on status
	if (session.status === 'active' && (hasFever || hasLowFeeling)) {
		return smartConfig.acuteIntervalHours; // More frequent during acute phase
	}

	// Check if improving
	const isImproving = checkIfImproving(last24Hours);
	if (isImproving) {
		return smartConfig.recoveryIntervalHours; // Less frequent during recovery
	}

	// Default to baseline
	return smartConfig.baselineIntervalHours;
}

/**
 * Check if recent entries show improvement
 */
function checkIfImproving(entries: Entry[]): boolean {
	// Need at least 2 entries to determine trend
	if (entries.length < 2) {
		return false;
	}

	// Sort by timestamp ascending
	const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	// Check temperature trend
	const tempEntries = sorted.filter((e) => e.value.type === 'temperature');
	if (tempEntries.length >= 2) {
		const first = tempEntries[0].value as { celsius: number };
		const last = tempEntries[tempEntries.length - 1].value as { celsius: number };

		// Improving if temperature is decreasing toward normal
		if (first.celsius > 37.5 && last.celsius < first.celsius) {
			return true;
		}
	}

	// Check feeling trend
	const feelingEntries = sorted.filter((e) => e.value.type === 'feeling');
	if (feelingEntries.length >= 2) {
		const first = feelingEntries[0].value as { emojiValue: number };
		const last = feelingEntries[feelingEntries.length - 1].value as { emojiValue: number };

		// Improving if feeling is increasing
		if (last.emojiValue > first.emojiValue) {
			return true;
		}
	}

	return false;
}

/**
 * Format reminder interval for display
 */
export function formatReminderInterval(hours: number): string {
	if (hours < 1) {
		return `${Math.round(hours * 60)} minutes`;
	}
	if (hours === 1) {
		return '1 hour';
	}
	if (hours < 24) {
		return `${hours} hours`;
	}
	if (hours === 24) {
		return '1 day';
	}
	return `${Math.round(hours / 24)} days`;
}

/**
 * Check if we're within quiet hours (if configured)
 */
export function isWithinQuietHours(
	quietStart?: string,
	quietEnd?: string
): boolean {
	if (!quietStart || !quietEnd) {
		return false;
	}

	const now = new Date();
	const currentHour = now.getHours();
	const currentMinute = now.getMinutes();
	const currentTime = currentHour * 60 + currentMinute;

	const [startHour, startMinute] = quietStart.split(':').map(Number);
	const [endHour, endMinute] = quietEnd.split(':').map(Number);

	const startTime = startHour * 60 + startMinute;
	const endTime = endHour * 60 + endMinute;

	// Handle overnight quiet hours (e.g., 22:00 - 07:00)
	if (startTime > endTime) {
		return currentTime >= startTime || currentTime < endTime;
	}

	return currentTime >= startTime && currentTime < endTime;
}
