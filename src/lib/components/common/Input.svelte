<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		error?: string;
		helper?: string;
		value?: string;
	}

	let {
		label,
		error,
		helper,
		id,
		value = $bindable(''),
		class: className = '',
		...rest
	}: Props = $props();

	const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="space-y-1">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
			{label}
		</label>
	{/if}

	<input
		id={inputId}
		bind:value
		class="w-full rounded-lg border bg-white px-3 py-2 text-neutral-800 placeholder-neutral-400 transition-colors focus:outline-none focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 {error
			? 'border-warning focus:border-warning focus:ring-warning/20'
			: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500/20 dark:border-neutral-600'} {className}"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
		{...rest}
	/>

	{#if error}
		<p id="{inputId}-error" class="text-sm text-warning" role="alert">
			{error}
		</p>
	{:else if helper}
		<p id="{inputId}-helper" class="text-sm text-neutral-500 dark:text-neutral-400">
			{helper}
		</p>
	{/if}
</div>
