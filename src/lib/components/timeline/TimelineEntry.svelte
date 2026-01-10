<script lang="ts">
	import type { Entry, MetricDefinition } from '$types';
	import { formatTime } from '$utils/dates';
	import { formatTemperature, getTemperatureStatus } from '$utils/temperature';

	interface Props {
		entry: Entry;
		metric?: MetricDefinition;
		temperatureUnit: 'celsius' | 'fahrenheit';
		onclick?: () => void;
	}

	let { entry, metric, temperatureUnit, onclick }: Props = $props();

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

	function getDisplayValue(entry: Entry): string {
		switch (entry.value.type) {
			case 'temperature':
				return formatTemperature(entry.value.celsius, temperatureUnit);
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

	const note = $derived(
		entry.note || (entry.value.type === 'feeling' && entry.value.note ? entry.value.note : '')
	);
</script>

<button
	{onclick}
	class="relative block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-[#242824] dark:hover:border-neutral-600"
>
	<!-- Time dot -->
	<div class="absolute -left-[1.375rem] top-4 h-2.5 w-2.5 rounded-full bg-primary-500"></div>

	<div class="flex items-start justify-between gap-2">
		<div class="flex items-center gap-2">
			<span class="text-lg">{getMetricIcon(entry.metricId)}</span>
			<span class="font-medium text-neutral-800 dark:text-neutral-100">
				{getDisplayValue(entry)}
			</span>
			{#if getTemperatureWarning(entry)}
				<span>{getTemperatureWarning(entry)}</span>
			{/if}
		</div>
		<span class="shrink-0 text-xs text-neutral-400">
			{formatTime(entry.timestamp)}
		</span>
	</div>

	{#if note}
		<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
			{note}
		</p>
	{/if}

	{#if entry.isRetrospective}
		<span class="mt-2 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
			Retrospective
		</span>
	{/if}
</button>
