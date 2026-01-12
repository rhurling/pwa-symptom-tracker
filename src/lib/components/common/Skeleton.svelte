<script lang="ts">
	interface Props {
		variant?: 'text' | 'circular' | 'rectangular';
		width?: string;
		height?: string;
		lines?: number;
		class?: string;
	}

	let {
		variant = 'text',
		width = '100%',
		height,
		lines = 1,
		class: className = ''
	}: Props = $props();

	const defaultHeights = {
		text: '1rem',
		circular: '3rem',
		rectangular: '4rem'
	};

	const computedHeight = height ?? defaultHeights[variant];

	const variantClasses = {
		text: 'rounded',
		circular: 'rounded-full',
		rectangular: 'rounded-lg'
	};
</script>

{#if variant === 'text' && lines > 1}
	<div class="space-y-2 {className}" style="width: {width}">
		{#each Array(lines) as _, i}
			<div
				class="animate-pulse bg-neutral-200 dark:bg-neutral-700 {variantClasses[variant]}"
				style="width: {i === lines - 1 ? '75%' : '100%'}; height: {computedHeight}"
				role="presentation"
				aria-hidden="true"
			></div>
		{/each}
	</div>
{:else}
	<div
		class="animate-pulse bg-neutral-200 dark:bg-neutral-700 {variantClasses[variant]} {className}"
		style="width: {variant === 'circular' ? computedHeight : width}; height: {computedHeight}"
		role="presentation"
		aria-hidden="true"
	></div>
{/if}
