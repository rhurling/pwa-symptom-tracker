<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { sessions, entries, metrics, metricsById, latestEntryByMetric } from '$stores';
	import { Button, Card, Modal } from '$components/common';
	import { formatTimeAgo, formatDuration, getDaysBetween } from '$utils/dates';
	import { formatTemperature, getTemperatureStatus, getTemperatureStatusLabel } from '$utils/temperature';
	import { settings } from '$stores';
	import { onMount } from 'svelte';
	import type { TrackingSession, Entry } from '$types';

	const sessionId = $derived($page.params.id!);
	let session = $state<TrackingSession | null>(null);
	let showStatusModal = $state(false);
	let showDeleteModal = $state(false);

	onMount(async () => {
		if (!sessionId) return;
		session = (await sessions.getById(sessionId)) ?? null;
		if (session) {
			await entries.loadForSession(sessionId);
		}
	});

	// Reload session when navigating back
	$effect(() => {
		if (sessionId) {
			sessions.getById(sessionId).then((s) => {
				session = s ?? null;
				if (session) {
					entries.loadForSession(sessionId);
				}
			});
		}
	});

	const dayCount = $derived(
		session ? getDaysBetween(session.createdAt, session.resolvedAt ?? new Date()) + 1 : 0
	);

	const statusConfig = {
		active: { label: 'Active', class: 'bg-success-bg text-success' },
		paused: { label: 'Paused', class: 'bg-caution-bg text-caution' },
		resolved: { label: 'Resolved', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' }
	};

	function handleBack() {
		goto('/');
	}

	function handleQuickLog() {
		goto(`/session/${sessionId}/log`);
	}

	function handleTimeline() {
		goto(`/session/${sessionId}/timeline`);
	}

	async function handleSetStatus(status: TrackingSession['status']) {
		if (!session) return;
		await sessions.setStatus(sessionId, status);
		session = (await sessions.getById(sessionId)) ?? null;
		showStatusModal = false;
	}

	async function handleDelete() {
		await sessions.remove(sessionId);
		goto('/');
	}

	function getMetricDisplayValue(entry: Entry): string {
		const metric = $metricsById.get(entry.metricId);
		if (!metric) return '';

		switch (entry.value.type) {
			case 'temperature':
				return formatTemperature(entry.value.celsius, $settings.temperatureUnit);
			case 'feeling':
				return `${entry.value.emoji} ${['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'][entry.value.emojiValue]}`;
			case 'event':
				return entry.value.description.slice(0, 50) + (entry.value.description.length > 50 ? '...' : '');
			case 'numeric':
				return `${entry.value.value}`;
			case 'scale':
				return `${entry.value.value}`;
			default:
				return '';
		}
	}

	function getMetricIcon(metricId: string): string {
		switch (metricId) {
			case 'temperature':
				return '🌡️';
			case 'feeling':
				return '😐';
			case 'event':
				return '📝';
			default:
				return '📊';
		}
	}
</script>

{#if session}
	<div class="space-y-4">
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
			<div class="min-w-0 flex-1">
				<h1 class="truncate text-xl font-bold text-neutral-800 dark:text-neutral-100">
					{session.name}
				</h1>
			</div>
			<button
				onclick={() => showStatusModal = true}
				class="rounded-full px-3 py-1 text-sm font-medium {statusConfig[session.status].class}"
			>
				{statusConfig[session.status].label}
			</button>
		</div>

		<!-- Session info -->
		{#if session.description}
			<p class="text-sm text-neutral-500 dark:text-neutral-400">{session.description}</p>
		{/if}

		<div class="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
			<span>Day {dayCount}</span>
			<span>{$entries.length} entries</span>
			<span>Updated {formatTimeAgo(session.updatedAt)}</span>
		</div>

		<!-- Quick actions -->
		<div class="grid grid-cols-2 gap-3">
			<Button onclick={handleQuickLog} class="flex-1">
				<svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				Quick Log
			</Button>
			<Button variant="secondary" onclick={handleTimeline} class="flex-1">
				<svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Timeline
			</Button>
		</div>

		<!-- Latest values -->
		{#if $latestEntryByMetric.size > 0}
			<Card>
				<h2 class="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Latest Values</h2>
				<div class="space-y-3">
					{#each session.enabledMetrics as metricConfig (metricConfig.metricId)}
						{@const latestEntry = $latestEntryByMetric.get(metricConfig.metricId)}
						{#if latestEntry}
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-lg">{getMetricIcon(metricConfig.metricId)}</span>
									<span class="text-sm text-neutral-600 dark:text-neutral-300">
										{$metricsById.get(metricConfig.metricId)?.name ?? metricConfig.metricId}
									</span>
								</div>
								<div class="text-right">
									<p class="font-medium text-neutral-800 dark:text-neutral-100">
										{getMetricDisplayValue(latestEntry)}
									</p>
									<p class="text-xs text-neutral-400">{formatTimeAgo(latestEntry.timestamp)}</p>
								</div>
							</div>
						{/if}
					{/each}
				</div>
			</Card>
		{/if}

		<!-- Recent entries -->
		{#if $entries.length > 0}
			<div>
				<h2 class="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Recent Entries</h2>
				<div class="space-y-2">
					{#each $entries.slice(0, 5) as entry (entry.id)}
						<Card padding="sm">
							<div class="flex items-start justify-between gap-2">
								<div class="flex items-center gap-2">
									<span>{getMetricIcon(entry.metricId)}</span>
									<span class="font-medium text-neutral-800 dark:text-neutral-100">
										{getMetricDisplayValue(entry)}
									</span>
								</div>
								<span class="shrink-0 text-xs text-neutral-400">
									{formatTimeAgo(entry.timestamp)}
								</span>
							</div>
							{#if entry.note}
								<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
									{entry.note}
								</p>
							{/if}
						</Card>
					{/each}
				</div>

				{#if $entries.length > 5}
					<button
						onclick={handleTimeline}
						class="mt-3 w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
					>
						View all {$entries.length} entries
					</button>
				{/if}
			</div>
		{:else}
			<Card class="text-center">
				<p class="text-neutral-500 dark:text-neutral-400">No entries yet</p>
				<Button class="mt-3" onclick={handleQuickLog}>Log your first entry</Button>
			</Card>
		{/if}

		<!-- Danger zone -->
		<div class="pt-4">
			<Button variant="ghost" class="w-full text-warning" onclick={() => showDeleteModal = true}>
				Delete Session
			</Button>
		</div>
	</div>

	<!-- Status Modal -->
	<Modal bind:open={showStatusModal} title="Change Status">
		<div class="space-y-2">
			{#each ['active', 'paused', 'resolved'] as status}
				<button
					onclick={() => handleSetStatus(status as TrackingSession['status'])}
					class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors {session.status === status
						? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
						: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'}"
				>
					<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusConfig[status as TrackingSession['status']].class}">
						{statusConfig[status as TrackingSession['status']].label}
					</span>
				</button>
			{/each}
		</div>
	</Modal>

	<!-- Delete Modal -->
	<Modal bind:open={showDeleteModal} title="Delete Session">
		<p class="text-neutral-600 dark:text-neutral-300">
			Are you sure you want to delete "{session.name}"? This will also delete all {$entries.length} entries. This action cannot be undone.
		</p>
		{#snippet footer()}
			<div class="flex gap-3">
				<Button variant="secondary" class="flex-1" onclick={() => showDeleteModal = false}>
					Cancel
				</Button>
				<Button variant="danger" class="flex-1" onclick={handleDelete}>
					Delete
				</Button>
			</div>
		{/snippet}
	</Modal>
{:else}
	<div class="py-12 text-center">
		<p class="text-neutral-500">Session not found</p>
		<Button class="mt-4" onclick={handleBack}>Go back</Button>
	</div>
{/if}
