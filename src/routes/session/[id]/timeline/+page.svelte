<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { sessions, entries, metrics, metricsById, settings } from '$stores';
	import { Button, Modal } from '$components/common';
	import { Timeline } from '$components/timeline';
	import { formatTime, formatDate } from '$utils/dates';
	import { formatTemperature, getTemperatureStatus } from '$utils/temperature';
	import { onMount } from 'svelte';
	import type { TrackingSession, Entry } from '$types';

	const sessionId = $derived($page.params.id!);
	let session = $state<TrackingSession | null>(null);
	let selectedEntry = $state<Entry | null>(null);
	let showEntryModal = $state(false);
	let showDeleteConfirm = $state(false);

	onMount(async () => {
		if (!sessionId) return;
		session = (await sessions.getById(sessionId)) ?? null;
		if (session) {
			await entries.loadForSession(sessionId);
		}
	});

	// Get enabled metrics for this session
	const sessionMetrics = $derived(
		session
			? session.enabledMetrics
					.map((mc) => $metricsById.get(mc.metricId))
					.filter((m): m is NonNullable<typeof m> => m != null)
			: []
	);

	function handleBack() {
		goto(`/session/${sessionId}`);
	}

	function handleQuickLog() {
		goto(`/session/${sessionId}/log`);
	}

	function openEntry(entry: Entry) {
		selectedEntry = entry;
		showEntryModal = true;
	}

	async function deleteEntry() {
		if (!selectedEntry) return;
		await entries.remove(selectedEntry.id);
		showDeleteConfirm = false;
		showEntryModal = false;
		selectedEntry = null;
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

	function getEntryDisplayValue(entry: Entry): string {
		switch (entry.value.type) {
			case 'temperature':
				return formatTemperature(entry.value.celsius, $settings.temperatureUnit);
			case 'feeling':
				return `${entry.value.emoji} ${['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'][entry.value.emojiValue]}`;
			case 'event':
				return entry.value.description;
			case 'numeric':
				return `${entry.value.value}`;
			case 'scale':
				return `${entry.value.value}`;
			default:
				return '';
		}
	}

	function getTemperatureWarning(entry: Entry): string | null {
		if (entry.value.type !== 'temperature') return null;
		const status = getTemperatureStatus(entry.value.celsius);
		if (status === 'fever') return '⚠️';
		if (status === 'high_fever') return '🔴';
		if (status === 'hypothermia') return '❄️';
		return null;
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
				<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">Timeline</h1>
				<p class="truncate text-sm text-neutral-500 dark:text-neutral-400">{session.name}</p>
			</div>
			<Button size="sm" onclick={handleQuickLog}>
				+ Log
			</Button>
		</div>

		<!-- Timeline Component -->
		<Timeline
			{session}
			entries={$entries}
			metrics={sessionMetrics}
			metricsById={$metricsById}
			temperatureUnit={$settings.temperatureUnit}
			onEntryClick={openEntry}
			onQuickLog={handleQuickLog}
		/>
	</div>

	<!-- Entry Detail Modal -->
	<Modal bind:open={showEntryModal} title="Entry Details">
		{#if selectedEntry}
			<div class="space-y-4">
				<div class="flex items-center gap-2 text-lg">
					<span>{getMetricIcon(selectedEntry.metricId)}</span>
					<span class="font-semibold">{getEntryDisplayValue(selectedEntry)}</span>
					{#if getTemperatureWarning(selectedEntry)}
						<span>{getTemperatureWarning(selectedEntry)}</span>
					{/if}
				</div>

				<div class="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
					<p><strong>Time:</strong> {formatDate(selectedEntry.timestamp)} at {formatTime(selectedEntry.timestamp)}</p>
					<p><strong>Metric:</strong> {$metricsById.get(selectedEntry.metricId)?.name ?? selectedEntry.metricId}</p>
					{#if selectedEntry.note || (selectedEntry.value.type === 'feeling' && selectedEntry.value.note)}
						<p><strong>Note:</strong> {selectedEntry.note || (selectedEntry.value.type === 'feeling' ? selectedEntry.value.note : '')}</p>
					{/if}
					{#if selectedEntry.isRetrospective}
						<p class="text-neutral-400">This entry was logged retrospectively.</p>
					{/if}
				</div>
			</div>
		{/if}

		{#snippet footer()}
			<div class="flex gap-3">
				<Button variant="ghost" class="flex-1 text-warning" onclick={() => showDeleteConfirm = true}>
					Delete
				</Button>
				<Button variant="secondary" class="flex-1" onclick={() => showEntryModal = false}>
					Close
				</Button>
			</div>
		{/snippet}
	</Modal>

	<!-- Delete Confirmation -->
	<Modal bind:open={showDeleteConfirm} title="Delete Entry">
		<p class="text-neutral-600 dark:text-neutral-300">
			Are you sure you want to delete this entry? This action cannot be undone.
		</p>
		{#snippet footer()}
			<div class="flex gap-3">
				<Button variant="secondary" class="flex-1" onclick={() => showDeleteConfirm = false}>
					Cancel
				</Button>
				<Button variant="danger" class="flex-1" onclick={deleteEntry}>
					Delete
				</Button>
			</div>
		{/snippet}
	</Modal>
{:else}
	<div class="py-12 text-center">
		<p class="text-neutral-500">Session not found</p>
		<Button class="mt-4" onclick={() => goto('/')}>Go back</Button>
	</div>
{/if}
