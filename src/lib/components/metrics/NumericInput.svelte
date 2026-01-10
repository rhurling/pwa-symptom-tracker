<script lang="ts">
	import type { NumericConfig, ThresholdConfig } from '$types';

	interface Props {
		value: number | null;
		config?: NumericConfig;
		thresholds?: ThresholdConfig;
		label?: string;
		icon?: string;
		onchange?: (value: number | null) => void;
	}

	let { value = $bindable(), config, thresholds, label = 'Value', icon = '🔢', onchange }: Props = $props();

	const defaultConfig: NumericConfig = {
		type: 'numeric',
		unit: '',
		decimalPlaces: 1,
		validRange: undefined
	};

	const effectiveConfig = config ?? defaultConfig;
	const step = $derived(Math.pow(10, -effectiveConfig.decimalPlaces));

	const displayValue = $derived(
		value !== null ? value.toFixed(effectiveConfig.decimalPlaces) : ''
	);

	// Check if value is within warning/critical thresholds
	const status = $derived(() => {
		if (value === null || !thresholds) return null;

		if (thresholds.criticalLow !== undefined && value <= thresholds.criticalLow) {
			return { level: 'critical', direction: 'low' };
		}
		if (thresholds.criticalHigh !== undefined && value >= thresholds.criticalHigh) {
			return { level: 'critical', direction: 'high' };
		}
		if (thresholds.warningLow !== undefined && value <= thresholds.warningLow) {
			return { level: 'warning', direction: 'low' };
		}
		if (thresholds.warningHigh !== undefined && value >= thresholds.warningHigh) {
			return { level: 'warning', direction: 'high' };
		}
		return null;
	});

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const inputValue = parseFloat(input.value);

		if (isNaN(inputValue)) {
			value = null;
			onchange?.(null);
			return;
		}

		// Validate against range if provided
		let newValue = inputValue;
		if (effectiveConfig.validRange) {
			newValue = Math.min(
				Math.max(inputValue, effectiveConfig.validRange.min),
				effectiveConfig.validRange.max
			);
		}

		// Round to specified decimal places
		newValue = Math.round(newValue * Math.pow(10, effectiveConfig.decimalPlaces)) / Math.pow(10, effectiveConfig.decimalPlaces);

		value = newValue;
		onchange?.(newValue);
	}

	function increment() {
		const current = value ?? 0;
		let newValue = current + step;

		if (effectiveConfig.validRange) {
			newValue = Math.min(newValue, effectiveConfig.validRange.max);
		}

		newValue = Math.round(newValue * Math.pow(10, effectiveConfig.decimalPlaces)) / Math.pow(10, effectiveConfig.decimalPlaces);
		value = newValue;
		onchange?.(newValue);
	}

	function decrement() {
		const current = value ?? 0;
		let newValue = current - step;

		if (effectiveConfig.validRange) {
			newValue = Math.max(newValue, effectiveConfig.validRange.min);
		}

		newValue = Math.round(newValue * Math.pow(10, effectiveConfig.decimalPlaces)) / Math.pow(10, effectiveConfig.decimalPlaces);
		value = newValue;
		onchange?.(newValue);
	}

	const statusInfo = $derived(status());
</script>

<div class="space-y-2">
	<label class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
		<span class="text-lg">{icon}</span>
		{label}
	</label>

	<div class="flex items-center gap-2">
		<!-- Decrement Button -->
		<button
			type="button"
			onclick={decrement}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-xl font-bold text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
			aria-label="Decrease value"
		>
			−
		</button>

		<!-- Input -->
		<div class="relative flex-1">
			<input
				type="number"
				inputmode="decimal"
				step={step}
				min={effectiveConfig.validRange?.min}
				max={effectiveConfig.validRange?.max}
				value={displayValue}
				oninput={handleInput}
				class="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-center text-2xl font-medium text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 {effectiveConfig.unit ? 'pr-16' : ''}"
				placeholder="0"
				aria-label="{label} value"
			/>
			{#if effectiveConfig.unit}
				<span class="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-neutral-500 dark:text-neutral-400">
					{effectiveConfig.unit}
				</span>
			{/if}
		</div>

		<!-- Increment Button -->
		<button
			type="button"
			onclick={increment}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-xl font-bold text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
			aria-label="Increase value"
		>
			+
		</button>
	</div>

	<!-- Range hint -->
	{#if effectiveConfig.validRange}
		<p class="text-center text-xs text-neutral-400">
			Range: {effectiveConfig.validRange.min} – {effectiveConfig.validRange.max} {effectiveConfig.unit}
		</p>
	{/if}

	<!-- Status indicator -->
	{#if statusInfo}
		<div class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm {statusInfo.level === 'critical' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'}">
			<span>{statusInfo.level === 'critical' ? '⚠️' : '⚡'}</span>
			<span>
				{statusInfo.level === 'critical' ? 'Critical' : 'Warning'}: Value is
				{statusInfo.direction === 'low' ? 'low' : 'high'}
			</span>
		</div>
	{/if}
</div>
