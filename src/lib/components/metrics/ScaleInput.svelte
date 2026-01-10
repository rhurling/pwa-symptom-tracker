<script lang="ts">
	import type { ScaleConfig } from '$types';

	interface Props {
		value: number | null;
		config?: ScaleConfig;
		label?: string;
		icon?: string;
		onchange?: (value: number | null) => void;
	}

	let { value = $bindable(), config, label = 'Scale', icon = '📊', onchange }: Props = $props();

	const defaultConfig: ScaleConfig = {
		type: 'scale',
		min: 1,
		max: 10,
		minLabel: 'Low',
		maxLabel: 'High',
		step: 1
	};

	const effectiveConfig = config ?? defaultConfig;

	// Generate scale options
	const scaleOptions = $derived(() => {
		const options: number[] = [];
		for (let i = effectiveConfig.min; i <= effectiveConfig.max; i += effectiveConfig.step) {
			options.push(i);
		}
		return options;
	});

	// Calculate percentage for slider position
	const sliderPercent = $derived(
		value !== null
			? ((value - effectiveConfig.min) / (effectiveConfig.max - effectiveConfig.min)) * 100
			: 50
	);

	function selectValue(val: number) {
		if (value === val) {
			// Deselect if clicking the same one
			value = null;
			onchange?.(null);
		} else {
			value = val;
			onchange?.(val);
		}
	}

	function handleSliderInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const newValue = parseFloat(input.value);
		value = newValue;
		onchange?.(newValue);
	}

	const options = $derived(scaleOptions());
	const showSegmented = $derived(options.length <= 10);
</script>

<div class="space-y-3">
	<label class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
		<span class="text-lg">{icon}</span>
		{label}
	</label>

	{#if showSegmented}
		<!-- Segmented control for small scales (≤10 options) -->
		<div class="flex justify-between gap-1">
			{#each options as option}
				<button
					type="button"
					onclick={() => selectValue(option)}
					class="flex min-w-[2.5rem] flex-1 flex-col items-center justify-center rounded-lg py-2 text-sm font-medium transition-all {value === option
						? 'bg-primary-500 text-white shadow-sm dark:bg-primary-600'
						: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'}"
					aria-label="{label}: {option}"
					aria-pressed={value === option}
				>
					{option}
				</button>
			{/each}
		</div>
	{:else}
		<!-- Slider for larger scales -->
		<div class="space-y-2">
			<div class="relative">
				<input
					type="range"
					min={effectiveConfig.min}
					max={effectiveConfig.max}
					step={effectiveConfig.step}
					value={value ?? effectiveConfig.min}
					oninput={handleSliderInput}
					class="slider-input h-2 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 dark:bg-neutral-700"
					aria-label="{label} slider"
				/>
				<!-- Value bubble -->
				{#if value !== null}
					<div
						class="absolute -top-8 -translate-x-1/2 transform rounded-md bg-primary-500 px-2 py-1 text-xs font-medium text-white"
						style="left: {sliderPercent}%"
					>
						{value}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Labels -->
	<div class="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
		<span>{effectiveConfig.minLabel} ({effectiveConfig.min})</span>
		<span>{effectiveConfig.maxLabel} ({effectiveConfig.max})</span>
	</div>

	<!-- Selected value display -->
	{#if value !== null}
		<p class="text-center text-sm text-neutral-600 dark:text-neutral-400">
			Selected: <span class="font-medium text-primary-600 dark:text-primary-400">{value}</span>
		</p>
	{/if}
</div>

<style>
	.slider-input::-webkit-slider-thumb {
		appearance: none;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-primary-500);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider-input::-moz-range-thumb {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--color-primary-500);
		cursor: pointer;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider-input:focus::-webkit-slider-thumb {
		box-shadow: 0 0 0 4px rgba(107, 142, 35, 0.2);
	}

	.slider-input:focus::-moz-range-thumb {
		box-shadow: 0 0 0 4px rgba(107, 142, 35, 0.2);
	}
</style>
