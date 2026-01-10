<script lang="ts">
	import type { MetricDefinition } from '$types';
	import { Card } from '$components/common';

	type ZoomLevel = '6h' | '24h' | '3d' | '7d' | 'all';

	interface Props {
		metrics: MetricDefinition[];
		selectedMetrics: Set<string>;
		zoomLevel: ZoomLevel;
		showAnnotations?: boolean;
		onMetricToggle: (metricId: string) => void;
		onZoomChange: (zoom: ZoomLevel) => void;
		onAnnotationsToggle?: () => void;
	}

	let {
		metrics,
		selectedMetrics,
		zoomLevel,
		showAnnotations = true,
		onMetricToggle,
		onZoomChange,
		onAnnotationsToggle
	}: Props = $props();

	const zoomOptions: { value: ZoomLevel; label: string }[] = [
		{ value: '6h', label: '6h' },
		{ value: '24h', label: '24h' },
		{ value: '3d', label: '3d' },
		{ value: '7d', label: '7d' },
		{ value: 'all', label: 'All' }
	];

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

<div class="space-y-3">
	<!-- Zoom controls -->
	<div class="flex items-center gap-2">
		<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400">View:</span>
		<div class="flex gap-1">
			{#each zoomOptions as option}
				<button
					onclick={() => onZoomChange(option.value)}
					class="rounded px-2 py-1 text-xs font-medium transition-colors {zoomLevel === option.value
						? 'bg-primary-500 text-white'
						: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Metric filters -->
	<div class="flex flex-wrap gap-2">
		{#each metrics as metric}
			<button
				onclick={() => onMetricToggle(metric.id)}
				class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors {selectedMetrics.has(metric.id)
					? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
					: 'border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-600'}"
			>
				<span>{getMetricIcon(metric.id)}</span>
				{metric.name}
			</button>
		{/each}
	</div>

	<!-- Annotations toggle -->
	{#if onAnnotationsToggle}
		<label class="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				checked={showAnnotations}
				onchange={onAnnotationsToggle}
				class="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
			/>
			<span class="text-neutral-600 dark:text-neutral-400">Show threshold warnings</span>
		</label>
	{/if}
</div>
