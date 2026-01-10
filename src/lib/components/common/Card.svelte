<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: 'default' | 'interactive';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let {
		variant = 'default',
		padding = 'md',
		class: className = '',
		onclick,
		children,
		...rest
	}: Props = $props();

	const paddingClasses = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};

	function handleKeyDown(event: KeyboardEvent) {
		if (variant === 'interactive' && onclick && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			(event.currentTarget as HTMLElement).click();
		}
	}
</script>

<div
	class="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-[#3d423d] dark:bg-[#242824] {variant === 'interactive' ? 'cursor-pointer transition-shadow hover:shadow-md active:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2' : ''} {paddingClasses[padding]} {className}"
	role={variant === 'interactive' && onclick ? 'button' : undefined}
	tabindex={variant === 'interactive' && onclick ? 0 : undefined}
	onkeydown={variant === 'interactive' ? handleKeyDown : undefined}
	{onclick}
	{...rest}
>
	{@render children()}
</div>
