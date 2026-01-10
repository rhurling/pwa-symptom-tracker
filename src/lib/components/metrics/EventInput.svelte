<script lang="ts">
	import type { EventConfig } from '$types';

	interface Props {
		value: string;
		config?: EventConfig;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(''), config, onchange }: Props = $props();

	const placeholder = config?.placeholder ?? 'What happened?';

	function handleInput(event: Event) {
		const input = event.target as HTMLTextAreaElement;
		value = input.value;
		onchange?.(input.value);
	}
</script>

<div class="space-y-2">
	<label class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
		<span class="text-lg">📝</span>
		Event
	</label>

	<textarea
		value={value}
		oninput={handleInput}
		placeholder={placeholder}
		rows="3"
		class="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
	></textarea>

	<p class="text-right text-xs text-neutral-400">
		e.g., "Took 500mg paracetamol", "Nausea started"
	</p>
</div>
