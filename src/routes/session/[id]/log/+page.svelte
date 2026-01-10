<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { sessions, entries, metricsById } from '$stores';
	import { Button, Card } from '$components/common';
	import { TemperatureInput, FeelingInput, EventInput, NumericInput, ScaleInput } from '$components/metrics';
	import { formatInputDateTime, parseInputDateTime } from '$utils/dates';
	import { onMount } from 'svelte';
	import type { TrackingSession, EntryValue, NumericConfig, ScaleConfig, MetricDefinition } from '$types';

	const sessionId = $derived($page.params.id!);
	let session = $state<TrackingSession | null>(null);
	let isSubmitting = $state(false);
	let success = $state(false);

	// Form state
	let timestamp = $state(formatInputDateTime(new Date()));
	let useCurrentTime = $state(true);

	// Metric values
	let temperatureValue = $state<number | null>(null);
	let feelingValue = $state<number | null>(null);
	let feelingEmoji = $state<string | null>(null);
	let feelingNote = $state('');
	let eventValue = $state('');

	// Dynamic metric values for numeric and scale types
	let numericValues = $state<Map<string, number | null>>(new Map());
	let scaleValues = $state<Map<string, number | null>>(new Map());

	// Get metric definition for a given metricId
	function getMetricDef(metricId: string): MetricDefinition | undefined {
		return $metricsById.get(metricId);
	}

	// Get enabled custom metrics (non-built-in)
	const enabledCustomMetrics = $derived(() => {
		if (!session) return [];
		return session.enabledMetrics
			.filter(m => {
				const def = getMetricDef(m.metricId);
				return def && !def.isBuiltIn;
			})
			.map(m => ({
				config: m,
				definition: getMetricDef(m.metricId)!
			}));
	});

	onMount(async () => {
		if (!sessionId) return;
		session = (await sessions.getById(sessionId)) ?? null;
	});

	function handleTimestampChange() {
		useCurrentTime = false;
	}

	function resetToNow() {
		timestamp = formatInputDateTime(new Date());
		useCurrentTime = true;
	}

	async function handleSubmit() {
		if (!session) return;

		const entriesToCreate: Array<{ metricId: string; value: EntryValue; note?: string }> = [];

		// Check which metrics have values
		if (temperatureValue !== null) {
			entriesToCreate.push({
				metricId: 'temperature',
				value: { type: 'temperature', celsius: temperatureValue }
			});
		}

		if (feelingValue !== null && feelingEmoji !== null) {
			entriesToCreate.push({
				metricId: 'feeling',
				value: {
					type: 'feeling',
					emoji: feelingEmoji,
					emojiValue: feelingValue,
					note: feelingNote || undefined
				},
				note: feelingNote || undefined
			});
		}

		if (eventValue.trim()) {
			entriesToCreate.push({
				metricId: 'event',
				value: { type: 'event', description: eventValue.trim() }
			});
		}

		// Handle numeric metrics
		for (const [metricId, numericValue] of numericValues) {
			if (numericValue !== null) {
				entriesToCreate.push({
					metricId,
					value: { type: 'numeric', value: numericValue }
				});
			}
		}

		// Handle scale metrics
		for (const [metricId, scaleValue] of scaleValues) {
			if (scaleValue !== null) {
				entriesToCreate.push({
					metricId,
					value: { type: 'scale', value: scaleValue }
				});
			}
		}

		if (entriesToCreate.length === 0) {
			return; // Nothing to save
		}

		isSubmitting = true;

		try {
			const entryTimestamp = useCurrentTime ? new Date() : parseInputDateTime(timestamp);
			const isRetrospective = !useCurrentTime && entryTimestamp < new Date();

			await entries.createMultiple(sessionId, entriesToCreate, {
				timestamp: entryTimestamp,
				isRetrospective
			});

			success = true;

			// Reset form
			temperatureValue = null;
			feelingValue = null;
			feelingEmoji = null;
			feelingNote = '';
			eventValue = '';
			numericValues = new Map();
			scaleValues = new Map();
			timestamp = formatInputDateTime(new Date());
			useCurrentTime = true;

			// Show success briefly then allow more entries
			setTimeout(() => {
				success = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to save entries:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleBack() {
		goto(`/session/${sessionId}`);
	}

	const hasAnyValue = $derived(
		temperatureValue !== null ||
		(feelingValue !== null && feelingEmoji !== null) ||
		eventValue.trim() ||
		Array.from(numericValues.values()).some(v => v !== null) ||
		Array.from(scaleValues.values()).some(v => v !== null)
	);

	function isMetricEnabled(metricId: string): boolean {
		return session?.enabledMetrics.some((m) => m.metricId === metricId) ?? false;
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
				<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">Quick Log</h1>
				<p class="truncate text-sm text-neutral-500 dark:text-neutral-400">{session.name}</p>
			</div>
		</div>

		<!-- Success message -->
		{#if success}
			<div class="rounded-lg bg-success-bg p-4 text-center text-success">
				<span class="text-2xl">✓</span>
				<p class="mt-1 font-medium">Entry saved!</p>
			</div>
		{/if}

		<!-- Time selector -->
		<Card>
			<div class="flex items-center justify-between gap-3">
				<div class="flex-1">
					<label class="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Time
					</label>
					<input
						type="datetime-local"
						bind:value={timestamp}
						onchange={handleTimestampChange}
						class="input"
					/>
				</div>
				{#if !useCurrentTime}
					<button
						onclick={resetToNow}
						class="mt-6 rounded-lg bg-primary-100 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300"
					>
						Now
					</button>
				{/if}
			</div>
			{#if !useCurrentTime}
				<p class="mt-2 text-xs text-neutral-500">
					This entry will be marked as retrospective
				</p>
			{/if}
		</Card>

		<!-- Metrics -->
		<div class="space-y-4">
			{#if isMetricEnabled('temperature')}
				<Card>
					<TemperatureInput
						bind:value={temperatureValue}
					/>
				</Card>
			{/if}

			{#if isMetricEnabled('feeling')}
				<Card>
					<FeelingInput
						bind:value={feelingValue}
						bind:note={feelingNote}
						onchange={(value, emoji) => {
							feelingValue = value;
							feelingEmoji = emoji;
						}}
					/>
				</Card>
			{/if}

			{#if isMetricEnabled('event')}
				<Card>
					<EventInput
						bind:value={eventValue}
					/>
				</Card>
			{/if}

			<!-- Custom metrics (numeric and scale) -->
			{#each enabledCustomMetrics() as { config, definition }}
				{#if definition.config.type === 'numeric'}
					<Card>
						<NumericInput
							value={numericValues.get(definition.id) ?? null}
							config={definition.config as NumericConfig}
							thresholds={config.thresholds}
							label={definition.name}
							onchange={(v) => {
								const newMap = new Map(numericValues);
								newMap.set(definition.id, v);
								numericValues = newMap;
							}}
						/>
					</Card>
				{:else if definition.config.type === 'scale'}
					<Card>
						<ScaleInput
							value={scaleValues.get(definition.id) ?? null}
							config={definition.config as ScaleConfig}
							label={definition.name}
							onchange={(v) => {
								const newMap = new Map(scaleValues);
								newMap.set(definition.id, v);
								scaleValues = newMap;
							}}
						/>
					</Card>
				{/if}
			{/each}
		</div>

		<!-- Submit button -->
		<div class="sticky bottom-20 z-10 -mx-4 bg-gradient-to-t from-neutral-50 via-neutral-50 to-transparent px-4 pb-4 pt-8 dark:from-[#1a1d1a] dark:via-[#1a1d1a]">
			<Button
				onclick={handleSubmit}
				class="w-full"
				loading={isSubmitting}
				disabled={!hasAnyValue || isSubmitting}
			>
				{hasAnyValue ? 'Save Entry' : 'Enter values to save'}
			</Button>
		</div>
	</div>
{:else}
	<div class="py-12 text-center">
		<p class="text-neutral-500">Session not found</p>
		<Button class="mt-4" onclick={() => goto('/')}>Go back</Button>
	</div>
{/if}
