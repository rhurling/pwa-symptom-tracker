<script lang="ts">
	import type { TrackingSession } from '$types';
	import { Card } from '$components/common';
	import { formatTimeAgo, formatDuration, getDaysBetween } from '$utils/dates';

	interface Props {
		session: TrackingSession;
		entryCount?: number;
		onclick?: () => void;
	}

	let { session, entryCount = 0, onclick }: Props = $props();

	const dayCount = $derived(getDaysBetween(session.createdAt, session.resolvedAt ?? new Date()));

	const statusConfig = {
		active: { label: 'Active', class: 'bg-success-bg text-success dark:bg-success-bg' },
		paused: { label: 'Paused', class: 'bg-caution-bg text-caution dark:bg-caution-bg' },
		resolved: { label: 'Resolved', class: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' }
	};

	const typeConfig = {
		acute: { label: 'Acute', icon: '⚡' },
		chronic: { label: 'Chronic', icon: '🔄' },
		monitoring: { label: 'Monitoring', icon: '📊' }
	};
</script>

<Card variant="interactive" class="block" onclick={onclick}>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<!-- Name -->
			<h3 class="truncate text-lg font-semibold text-neutral-800 dark:text-neutral-100">
				{session.name}
			</h3>

			<!-- Description -->
			{#if session.description}
				<p class="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
					{session.description}
				</p>
			{/if}

			<!-- Meta info -->
			<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
				<span class="flex items-center gap-1">
					<span>{typeConfig[session.sessionType].icon}</span>
					{typeConfig[session.sessionType].label}
				</span>
				<span>Day {dayCount + 1}</span>
				<span>{entryCount} entries</span>
			</div>
		</div>

		<!-- Status badge -->
		<span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium {statusConfig[session.status].class}">
			{statusConfig[session.status].label}
		</span>
	</div>

	<!-- Last updated -->
	<p class="mt-3 text-xs text-neutral-400 dark:text-neutral-500">
		Updated {formatTimeAgo(session.updatedAt)}
	</p>
</Card>
