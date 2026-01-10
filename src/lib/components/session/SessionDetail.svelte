<script lang="ts">
	import type { TrackingSession, Entry, MetricDefinition } from '$types';
	import { Card, Button } from '$components/common';
	import { formatTimeAgo, getDaysBetween } from '$utils/dates';
	import { formatTemperature } from '$utils/temperature';
	import { detectAllTrends, getTrendArrow, getTrendColorClass, getTrendLabel } from '$lib/services/trends';

	interface Props {
		session: TrackingSession;
		entries: Entry[];
		metricsById: Map<string, MetricDefinition>;
		latestEntryByMetric: Map<string, Entry>;
		temperatureUnit: 'celsius' | 'fahrenheit';
		onQuickLog?: () => void;
		onTimeline?: () => void;
	}

	let {
		session,
		entries,
		metricsById,
		latestEntryByMetric,
		temperatureUnit,
		onQuickLog,
		onTimeline
	}: Props = $props();

	const dayCount = $derived(
		getDaysBetween(session.createdAt, session.resolvedAt ?? new Date()) + 1
	);

	const statusConfig = {
		active: { label: 'Active', class: 'bg-success-bg text-success' },
		paused: { label: 'Paused', class: 'bg-caution-bg text-caution' },
		resolved: { label: 'Resolved', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' }
	};

	// Calculate trends for all metrics
	const metricIds = $derived(session.enabledMetrics.map((mc) => mc.metricId));
	const trends = $derived(detectAllTrends(entries, metricIds, 24));

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

	function getMetricDisplayValue(entry: Entry): string {
		switch (entry.value.type) {
			case 'temperature':
				return formatTemperature(entry.value.celsius, temperatureUnit);
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
</script>

<div class="space-y-4">
	<!-- Session info -->
	{#if session.description}
		<p class="text-sm text-neutral-500 dark:text-neutral-400">{session.description}</p>
	{/if}

	<div class="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
		<span>Day {dayCount}</span>
		<span>{entries.length} entries</span>
		<span>Updated {formatTimeAgo(session.updatedAt)}</span>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-2 gap-3">
		{#if onQuickLog}
			<Button onclick={onQuickLog} class="flex-1">
				<svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				Quick Log
			</Button>
		{/if}
		{#if onTimeline}
			<Button variant="secondary" onclick={onTimeline} class="flex-1">
				<svg class="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Timeline
			</Button>
		{/if}
	</div>

	<!-- Latest values with trends -->
	{#if latestEntryByMetric.size > 0}
		<Card>
			<h2 class="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Latest Values</h2>
			<div class="space-y-3">
				{#each session.enabledMetrics as metricConfig (metricConfig.metricId)}
					{@const latestEntry = latestEntryByMetric.get(metricConfig.metricId)}
					{@const trend = trends.get(metricConfig.metricId)}
					{#if latestEntry}
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="text-lg">{getMetricIcon(metricConfig.metricId)}</span>
								<span class="text-sm text-neutral-600 dark:text-neutral-300">
									{metricsById.get(metricConfig.metricId)?.name ?? metricConfig.metricId}
								</span>
							</div>
							<div class="flex items-center gap-3">
								<!-- Trend indicator -->
								{#if trend && trend !== 'insufficient_data'}
									<div class="flex items-center gap-1 {getTrendColorClass(trend)}" title={getTrendLabel(trend)}>
										<span class="text-sm font-medium">{getTrendArrow(trend)}</span>
										<span class="text-xs">{getTrendLabel(trend)}</span>
									</div>
								{/if}
								<div class="text-right">
									<p class="font-medium text-neutral-800 dark:text-neutral-100">
										{getMetricDisplayValue(latestEntry)}
									</p>
									<p class="text-xs text-neutral-400">{formatTimeAgo(latestEntry.timestamp)}</p>
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</Card>
	{/if}

	<!-- Recent entries -->
	{#if entries.length > 0}
		<div>
			<h2 class="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Recent Entries</h2>
			<div class="space-y-2">
				{#each entries.slice(0, 5) as entry (entry.id)}
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

			{#if entries.length > 5 && onTimeline}
				<button
					onclick={onTimeline}
					class="mt-3 w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
				>
					View all {entries.length} entries
				</button>
			{/if}
		</div>
	{:else}
		<Card class="text-center">
			<p class="text-neutral-500 dark:text-neutral-400">No entries yet</p>
			{#if onQuickLog}
				<Button class="mt-3" onclick={onQuickLog}>Log your first entry</Button>
			{/if}
		</Card>
	{/if}
</div>
