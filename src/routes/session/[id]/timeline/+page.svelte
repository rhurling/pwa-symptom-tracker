<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { sessions, entries, metricsById, settings } from '$stores';
	import { Button, Card, Modal } from '$components/common';
	import { formatTime, formatDate, formatTimeAgo, isSameDayAs } from '$utils/dates';
	import { formatTemperature, getTemperatureStatus } from '$utils/temperature';
	import { groupEntriesByDay } from '$utils/grouping';
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

	const groupedEntries = $derived(groupEntriesByDay($entries));

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

		<!-- Timeline -->
		{#if groupedEntries.length === 0}
			<Card class="text-center">
				<p class="text-neutral-500 dark:text-neutral-400">No entries yet</p>
				<Button class="mt-3" onclick={handleQuickLog}>Log your first entry</Button>
			</Card>
		{:else}
			<div class="space-y-6">
				{#each groupedEntries as group (group.label)}
					<div>
						<!-- Date header -->
						<div class="sticky top-14 z-10 -mx-4 bg-neutral-50/95 px-4 py-2 backdrop-blur-sm dark:bg-[#1a1d1a]/95">
							<h2 class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
								{formatDate(group.date)}
							</h2>
						</div>

						<!-- Entries for this day -->
						<div class="relative ml-4 space-y-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-700">
							{#each group.entries as entry (entry.id)}
								<button
									onclick={() => openEntry(entry)}
									class="relative block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-[#242824] dark:hover:border-neutral-600"
								>
									<!-- Time dot -->
									<div class="absolute -left-[1.375rem] top-4 h-2.5 w-2.5 rounded-full bg-primary-500"></div>

									<div class="flex items-start justify-between gap-2">
										<div class="flex items-center gap-2">
											<span class="text-lg">{getMetricIcon(entry.metricId)}</span>
											<span class="font-medium text-neutral-800 dark:text-neutral-100">
												{getEntryDisplayValue(entry)}
											</span>
											{#if getTemperatureWarning(entry)}
												<span>{getTemperatureWarning(entry)}</span>
											{/if}
										</div>
										<span class="shrink-0 text-xs text-neutral-400">
											{formatTime(entry.timestamp)}
										</span>
									</div>

									{#if entry.note || (entry.value.type === 'feeling' && entry.value.note)}
										<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
											{entry.note || (entry.value.type === 'feeling' ? entry.value.note : '')}
										</p>
									{/if}

									{#if entry.isRetrospective}
										<span class="mt-2 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
											Retrospective
										</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
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
