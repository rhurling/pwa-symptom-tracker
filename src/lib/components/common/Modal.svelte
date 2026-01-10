<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { createFocusTrap } from '$lib/utils/accessibility';

	interface Props {
		open: boolean;
		title?: string;
		onclose?: () => void;
		children: Snippet;
		footer?: Snippet;
	}

	let { open = $bindable(), title, onclose, children, footer }: Props = $props();

	let modalElement: HTMLElement | null = $state(null);
	let cleanupFocusTrap: (() => void) | null = null;

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	// Set up focus trap when modal opens
	$effect(() => {
		if (open && modalElement) {
			// Small delay to ensure content is rendered
			const timeoutId = setTimeout(() => {
				if (modalElement) {
					cleanupFocusTrap = createFocusTrap(modalElement);
				}
			}, 50);

			return () => {
				clearTimeout(timeoutId);
				cleanupFocusTrap?.();
				cleanupFocusTrap = null;
			};
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<!-- Modal Content -->
		<div
			bind:this={modalElement}
			class="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-2xl bg-white dark:bg-[#242824] sm:rounded-2xl"
			transition:fly={{ y: 100, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			{#if title}
				<div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-[#3d423d]">
					<h2 id="modal-title" class="text-lg font-semibold">{title}</h2>
					<button
						onclick={handleClose}
						class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
						aria-label="Close"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			<!-- Body -->
			<div class="p-4">
				{@render children()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="border-t border-neutral-200 px-4 py-3 dark:border-[#3d423d]">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
