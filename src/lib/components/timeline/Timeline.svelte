<script lang="ts">
	import type { Entry, MetricDefinition, TrackingSession } from '$types';
	import { Button, Card, Modal } from '$components/common';
	import TimelineEntry from './TimelineEntry.svelte';
	import TimelineGroup from './TimelineGroup.svelte';
	import TimelineFilters from './TimelineFilters.svelte';
	import { groupEntriesByDay } from '$utils/grouping';
	import { formatDate, formatTime } from '$utils/dates';
	import { subHours, subDays, isAfter } from 'date-fns';

	type ZoomLevel = '6h' | '24h' | '3d' | '7d' | 'all';

	interface Props {
		session: TrackingSession;
		entries: Entry[];
		metrics: MetricDefinition[];
		metricsById: Map<string, MetricDefinition>;
		temperatureUnit: 'celsius' | 'fahrenheit';
		onEntryClick?: (entry: Entry) => void;
		onQuickLog?: () => void;
	}

	let {
		session,
		entries,
		metrics,
		metricsById,
		temperatureUnit,
		onEntryClick,
		onQuickLog
	}: Props = $props();

	let zoomLevel = $state<ZoomLevel>('all');
	let selectedMetrics = $state<Set<string>>(new Set(metrics.map((m) => m.id)));
	let showAnnotations = $state(true);
	let collapsedGroups = $state<Set<string>>(new Set());

	// Calculate the cutoff date based on zoom level
	const cutoffDate = $derived(() => {
		const now = new Date();
		switch (zoomLevel) {
			case '6h':
				return subHours(now, 6);
			case '24h':
				return subHours(now, 24);
			case '3d':
				return subDays(now, 3);
			case '7d':
				return subDays(now, 7);
			case 'all':
			default:
				return null;
		}
	});

	// Filter entries based on zoom level and selected metrics
	const filteredEntries = $derived(
		entries.filter((entry) => {
			// Filter by selected metrics
			if (!selectedMetrics.has(entry.metricId)) return false;

			// Filter by zoom level
			const cutoff = cutoffDate();
			if (cutoff && !isAfter(entry.timestamp, cutoff)) return false;

			return true;
		})
	);

	// Group filtered entries by day
	const groupedEntries = $derived(groupEntriesByDay(filteredEntries));

	function handleMetricToggle(metricId: string) {
		const newSet = new Set(selectedMetrics);
		if (newSet.has(metricId)) {
			// Don't allow deselecting all metrics
			if (newSet.size > 1) {
				newSet.delete(metricId);
			}
		} else {
			newSet.add(metricId);
		}
		selectedMetrics = newSet;
	}

	function handleZoomChange(zoom: ZoomLevel) {
		zoomLevel = zoom;
	}

	function handleAnnotationsToggle() {
		showAnnotations = !showAnnotations;
	}

	function toggleGroupCollapse(dateKey: string) {
		const newSet = new Set(collapsedGroups);
		if (newSet.has(dateKey)) {
			newSet.delete(dateKey);
		} else {
			newSet.add(dateKey);
		}
		collapsedGroups = newSet;
	}
</script>

<div class="space-y-4">
	<!-- Filters -->
	<TimelineFilters
		{metrics}
		{selectedMetrics}
		{zoomLevel}
		{showAnnotations}
		onMetricToggle={handleMetricToggle}
		onZoomChange={handleZoomChange}
		onAnnotationsToggle={handleAnnotationsToggle}
	/>

	<!-- Timeline -->
	{#if groupedEntries.length === 0}
		<Card class="text-center">
			<p class="text-neutral-500 dark:text-neutral-400">
				{#if filteredEntries.length === 0 && entries.length > 0}
					No entries match your filters
				{:else}
					No entries yet
				{/if}
			</p>
			{#if onQuickLog}
				<Button class="mt-3" onclick={onQuickLog}>Log your first entry</Button>
			{/if}
		</Card>
	{:else}
		<div class="space-y-6">
			{#each groupedEntries as group (group.label)}
				<TimelineGroup
					date={group.date}
					entryCount={group.entries.length}
					collapsed={collapsedGroups.has(group.label)}
					onToggle={() => toggleGroupCollapse(group.label)}
				>
					{#each group.entries as entry (entry.id)}
						<TimelineEntry
							{entry}
							metric={metricsById.get(entry.metricId)}
							{temperatureUnit}
							onclick={() => onEntryClick?.(entry)}
						/>
					{/each}
				</TimelineGroup>
			{/each}
		</div>

		<!-- Summary -->
		<div class="pt-4 text-center text-xs text-neutral-400">
			Showing {filteredEntries.length} of {entries.length} entries
		</div>
	{/if}
</div>
