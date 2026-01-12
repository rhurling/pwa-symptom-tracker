<script lang="ts">
	import type { Snippet } from 'svelte';
	import { formatDate } from '$utils/dates';

	interface Props {
		date: Date;
		entryCount: number;
		collapsed?: boolean;
		onToggle?: () => void;
		children: Snippet;
	}

	let { date, entryCount, collapsed = false, onToggle, children }: Props = $props();
</script>

<div>
	<!-- Date header -->
	<div class="sticky top-14 z-10 -mx-4 bg-neutral-50/95 px-4 py-2 backdrop-blur-sm dark:bg-[#1a1d1a]/95">
		{#if onToggle}
			<button
				onclick={onToggle}
				class="flex w-full items-center justify-between text-left"
			>
				<h2 class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
					{formatDate(date)}
				</h2>
				<div class="flex items-center gap-2">
					<span class="text-xs text-neutral-400">{entryCount} entries</span>
					<svg
						class="h-4 w-4 text-neutral-400 transition-transform {collapsed ? '' : 'rotate-180'}"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</div>
			</button>
		{:else}
			<h2 class="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
				{formatDate(date)}
			</h2>
		{/if}
	</div>

	<!-- Entries for this day -->
	{#if !collapsed}
		<div class="relative ml-4 space-y-3 border-l-2 border-neutral-200 pl-4 dark:border-neutral-700">
			{@render children()}
		</div>
	{/if}
</div>
