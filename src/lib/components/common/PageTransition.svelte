<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { prefersReducedMotion } from '$lib/utils/accessibility';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Track page key for transitions
	let pageKey = $derived($page.url.pathname);
	let hasReducedMotion = $state(false);

	$effect(() => {
		hasReducedMotion = prefersReducedMotion();
	});
</script>

{#key pageKey}
	<div class={hasReducedMotion ? '' : 'animate-fade-in'}>
		{@render children()}
	</div>
{/key}
