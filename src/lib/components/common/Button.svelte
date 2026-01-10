<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		loading?: boolean;
		icon?: boolean;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		icon = false,
		disabled,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variantClasses = {
		primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500',
		secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 active:bg-neutral-400 dark:bg-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-600 focus:ring-neutral-400',
		ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:ring-neutral-400',
		danger: 'bg-warning text-white hover:opacity-90 active:opacity-80 focus:ring-warning'
	};

	const sizeClasses = $derived({
		sm: icon ? 'p-2' : 'px-3 py-1.5 text-sm',
		md: icon ? 'p-2.5' : 'px-4 py-2',
		lg: icon ? 'p-3' : 'px-6 py-3 text-lg'
	});
</script>

<button
	class="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {variantClasses[variant]} {sizeClasses[size]} {className}"
	disabled={disabled || loading}
	{...rest}
>
	{#if loading}
		<svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	{/if}
	{@render children()}
</button>
