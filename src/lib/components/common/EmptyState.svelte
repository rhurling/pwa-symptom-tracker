<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		actionLabel?: string;
		onAction?: () => void;
		children?: Snippet;
	}

	let {
		icon = '📋',
		title,
		description,
		actionLabel,
		onAction,
		children
	}: Props = $props();
</script>

<div class="py-12 text-center">
	<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
		<span class="text-3xl">{icon}</span>
	</div>
	<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{title}</h2>
	{#if description}
		<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
			{description}
		</p>
	{/if}
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{:else if actionLabel && onAction}
		<Button class="mt-4" onclick={onAction}>
			{actionLabel}
		</Button>
	{/if}
</div>
