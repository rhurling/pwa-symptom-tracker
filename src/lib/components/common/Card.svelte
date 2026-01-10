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
		children,
		...rest
	}: Props = $props();

	const paddingClasses = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6'
	};
</script>

<div
	class="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-[#3d423d] dark:bg-[#242824] {variant === 'interactive' ? 'cursor-pointer transition-shadow hover:shadow-md active:shadow-sm' : ''} {paddingClasses[padding]} {className}"
	{...rest}
>
	{@render children()}
</div>
