<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button, Card } from '$components/common';
	import {
		isNotificationSupported,
		getNotificationPermission,
		requestNotificationPermission,
		sendTestNotification,
		type NotificationPermissionState
	} from '$lib/services/notifications';
	import { onMount } from 'svelte';

	let permissionState = $state<NotificationPermissionState>('default');
	let isRequesting = $state(false);
	let testResult = $state<'success' | 'failed' | null>(null);

	onMount(() => {
		permissionState = getNotificationPermission();
	});

	function handleBack() {
		goto('/settings');
	}

	async function handleRequestPermission() {
		isRequesting = true;
		try {
			permissionState = await requestNotificationPermission();
		} finally {
			isRequesting = false;
		}
	}

	async function handleTestNotification() {
		testResult = null;
		const success = await sendTestNotification();
		testResult = success ? 'success' : 'failed';

		// Clear result after 3 seconds
		setTimeout(() => {
			testResult = null;
		}, 3000);
	}

	function getPermissionStatusLabel(status: NotificationPermissionState): string {
		switch (status) {
			case 'granted':
				return 'Enabled';
			case 'denied':
				return 'Blocked';
			case 'default':
				return 'Not Set';
			case 'unsupported':
				return 'Not Supported';
		}
	}

	function getPermissionStatusColor(status: NotificationPermissionState): string {
		switch (status) {
			case 'granted':
				return 'text-success bg-success-bg';
			case 'denied':
				return 'text-warning bg-warning/10';
			case 'default':
				return 'text-neutral-500 bg-neutral-100 dark:bg-neutral-700';
			case 'unsupported':
				return 'text-neutral-400 bg-neutral-100 dark:bg-neutral-700';
		}
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<button
			onclick={handleBack}
			class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
			aria-label="Go back"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">Notifications</h1>
	</div>

	<p class="text-sm text-neutral-500 dark:text-neutral-400">
		Configure how and when the app reminds you to log your symptoms.
	</p>

	<!-- Permission Status -->
	<Card>
		<div class="flex items-center justify-between">
			<div>
				<h2 class="font-medium text-neutral-800 dark:text-neutral-100">Notification Permission</h2>
				<p class="mt-1 text-sm text-neutral-500">Allow the app to send you reminders</p>
			</div>
			<span class="rounded-full px-3 py-1 text-sm font-medium {getPermissionStatusColor(permissionState)}">
				{getPermissionStatusLabel(permissionState)}
			</span>
		</div>

		{#if permissionState === 'unsupported'}
			<div class="mt-4 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
				<p class="text-sm text-neutral-600 dark:text-neutral-400">
					Your browser doesn't support notifications. Try using a modern browser like Chrome, Firefox, or Safari.
				</p>
			</div>
		{:else if permissionState === 'denied'}
			<div class="mt-4 rounded-lg bg-warning/10 p-3">
				<p class="text-sm text-warning">
					Notifications are blocked. To enable them:
				</p>
				<ol class="mt-2 list-inside list-decimal text-sm text-neutral-600 dark:text-neutral-400">
					<li>Click the lock/info icon in your browser's address bar</li>
					<li>Find "Notifications" in the permissions list</li>
					<li>Change it from "Block" to "Allow"</li>
					<li>Refresh this page</li>
				</ol>
			</div>
		{:else if permissionState === 'default'}
			<div class="mt-4">
				<Button onclick={handleRequestPermission} loading={isRequesting} class="w-full">
					Enable Notifications
				</Button>
			</div>
		{:else if permissionState === 'granted'}
			<div class="mt-4 space-y-3">
				<div class="flex items-center gap-2 text-sm text-success">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					Notifications are enabled
				</div>

				<Button variant="secondary" onclick={handleTestNotification} class="w-full">
					{#if testResult === 'success'}
						Sent!
					{:else if testResult === 'failed'}
						Failed - Check browser settings
					{:else}
						Send Test Notification
					{/if}
				</Button>
			</div>
		{/if}
	</Card>

	<!-- Reminder Info -->
	<Card>
		<h2 class="mb-3 font-medium text-neutral-800 dark:text-neutral-100">How Reminders Work</h2>

		<div class="space-y-4">
			<div class="flex gap-3">
				<span class="text-xl">🧠</span>
				<div>
					<p class="font-medium text-neutral-800 dark:text-neutral-100">Smart Mode</p>
					<p class="text-sm text-neutral-500 dark:text-neutral-400">
						Adjusts reminder frequency based on your symptoms. More frequent when you're feeling worse, less frequent as you recover.
					</p>
				</div>
			</div>

			<div class="flex gap-3">
				<span class="text-xl">🕐</span>
				<div>
					<p class="font-medium text-neutral-800 dark:text-neutral-100">Scheduled Mode</p>
					<p class="text-sm text-neutral-500 dark:text-neutral-400">
						Reminders at fixed times you choose. Great for routine tracking or when you prefer predictability.
					</p>
				</div>
			</div>
		</div>

		<div class="mt-4 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
			<p class="text-sm text-neutral-600 dark:text-neutral-400">
				Configure reminder preferences when creating or editing a tracking session. Each session can have its own reminder settings.
			</p>
		</div>
	</Card>

	<!-- Tips -->
	<Card>
		<h2 class="mb-3 font-medium text-neutral-800 dark:text-neutral-100">Tips for Effective Tracking</h2>

		<ul class="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
			<li class="flex items-start gap-2">
				<span class="text-primary-500">•</span>
				<span>Log symptoms as soon as you notice them for the most accurate data</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-primary-500">•</span>
				<span>Use smart reminders during acute illness when tracking frequency matters most</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-primary-500">•</span>
				<span>Switch to scheduled reminders for chronic condition monitoring</span>
			</li>
			<li class="flex items-start gap-2">
				<span class="text-primary-500">•</span>
				<span>Add notes to capture context that numbers can't express</span>
			</li>
		</ul>
	</Card>
</div>
