<script lang="ts">
	import type { FeelingConfig, EmojiOption } from '$types';

	interface Props {
		value: number | null;
		config?: FeelingConfig;
		showNote?: boolean;
		note?: string;
		onchange?: (value: number | null, emoji: string | null) => void;
		onnotechange?: (note: string) => void;
	}

	let {
		value = $bindable(),
		config,
		showNote = true,
		note = $bindable(''),
		onchange,
		onnotechange
	}: Props = $props();

	const defaultEmojiScale: EmojiOption[] = [
		{ emoji: '😫', label: 'Terrible', value: 1 },
		{ emoji: '😟', label: 'Poor', value: 2 },
		{ emoji: '😐', label: 'Okay', value: 3 },
		{ emoji: '🙂', label: 'Good', value: 4 },
		{ emoji: '😊', label: 'Great', value: 5 }
	];

	const emojiScale = $derived(config?.emojiScale ?? defaultEmojiScale);
	const selectedEmoji = $derived(emojiScale.find((e) => e.value === value));

	function selectEmoji(option: EmojiOption) {
		if (value === option.value) {
			// Deselect if clicking the same one
			value = null;
			onchange?.(null, null);
		} else {
			value = option.value;
			onchange?.(option.value, option.emoji);
		}
	}

	function handleNoteChange(event: Event) {
		const input = event.target as HTMLTextAreaElement;
		note = input.value;
		onnotechange?.(input.value);
	}
</script>

<div class="space-y-3">
	<label class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
		<span class="text-lg">😐</span>
		How are you feeling?
	</label>

	<!-- Emoji selector -->
	<div class="flex justify-between gap-2">
		{#each emojiScale as option}
			<button
				type="button"
				onclick={() => selectEmoji(option)}
				class="flex h-14 w-14 flex-col items-center justify-center rounded-xl transition-all {value === option.value
					? 'bg-primary-100 ring-2 ring-primary-500 dark:bg-primary-900/30'
					: 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600'}"
				aria-label={option.label}
				aria-pressed={value === option.value}
			>
				<span class="text-2xl" aria-hidden="true">{option.emoji}</span>
			</button>
		{/each}
	</div>

	<!-- Selected label -->
	{#if selectedEmoji}
		<p class="text-center text-sm text-neutral-600 dark:text-neutral-400">
			Feeling: <span class="font-medium">{selectedEmoji.label}</span>
		</p>
	{/if}

	<!-- Optional note -->
	{#if showNote}
		<textarea
			value={note}
			oninput={handleNoteChange}
			placeholder="Add a note... (optional)"
			rows="2"
			class="w-full resize-none rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
		></textarea>
	{/if}
</div>
