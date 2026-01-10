<script lang="ts">
	import Spinner from './Spinner.svelte';

	interface Props {
		message?: string;
		fullPage?: boolean;
		class?: string;
	}

	let { message = 'Loading...', fullPage = false, class: className = '' }: Props = $props();
</script>

<div
	class="flex flex-col items-center justify-center gap-3 {fullPage
		? 'min-h-[60vh]'
		: 'py-8'} {className}"
	role="status"
	aria-live="polite"
>
	<Spinner size={fullPage ? 'xl' : 'lg'} />
	<p class="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
</div>
