<script lang="ts">
	import { isOnline } from '$lib/stores/connection';
	import { fade, fly } from 'svelte/transition';

	interface Props {
		variant?: 'banner' | 'toast' | 'minimal';
		class?: string;
	}

	let { variant = 'banner', class: className = '' }: Props = $props();

	// Show indicator when offline
	let visible = $derived(!$isOnline);
</script>

{#if visible}
	{#if variant === 'banner'}
		<div
			class="fixed inset-x-0 top-0 z-50 bg-warning px-4 py-2 text-center text-sm text-white shadow-md {className}"
			role="alert"
			aria-live="polite"
			transition:fly={{ y: -48, duration: 300 }}
		>
			<div class="flex items-center justify-center gap-2">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
					/>
				</svg>
				<span>You're offline. Your data is saved locally.</span>
			</div>
		</div>
	{:else if variant === 'toast'}
		<div
			class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg dark:bg-neutral-700 {className}"
			role="alert"
			aria-live="polite"
			transition:fade={{ duration: 200 }}
		>
			<div class="flex items-center gap-2">
				<span class="h-2 w-2 rounded-full bg-warning"></span>
				<span>Offline mode</span>
			</div>
		</div>
	{:else}
		<div
			class="flex items-center gap-1 text-xs text-warning {className}"
			role="status"
			aria-label="Offline"
			transition:fade={{ duration: 200 }}
		>
			<span class="h-1.5 w-1.5 rounded-full bg-warning"></span>
			<span>Offline</span>
		</div>
	{/if}
{/if}
