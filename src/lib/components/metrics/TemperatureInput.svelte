<script lang="ts">
	import { settings } from '$stores';
	import {
		celsiusToFahrenheit,
		fahrenheitToCelsius,
		getTemperatureStatus,
		getTemperatureStatusLabel,
		getTemperatureStatusColor
	} from '$utils/temperature';
	import type { ThresholdConfig, TemperatureConfig } from '$types';

	interface Props {
		value: number | null;
		config?: TemperatureConfig;
		thresholds?: ThresholdConfig;
		onchange?: (celsius: number | null) => void;
	}

	let { value = $bindable(), config, thresholds, onchange }: Props = $props();

	const defaultConfig: TemperatureConfig = {
		type: 'temperature',
		validRange: { min: 34.0, max: 43.0 },
		defaultThresholds: {
			feverWarning: 37.5,
			feverCritical: 39.0,
			hypoWarning: 35.5
		}
	};

	const effectiveConfig = config ?? defaultConfig;
	const unit = $derived($settings.temperatureUnit);

	// Display value in user's preferred unit
	const displayValue = $derived(
		value !== null
			? unit === 'fahrenheit'
				? celsiusToFahrenheit(value).toFixed(1)
				: value.toFixed(1)
			: ''
	);

	const status = $derived(
		value !== null ? getTemperatureStatus(value, thresholds, effectiveConfig.defaultThresholds) : null
	);
	const statusLabel = $derived(status ? getTemperatureStatusLabel(status) : null);
	const statusColor = $derived(status ? getTemperatureStatusColor(status) : '');

	// Get min/max in display unit
	const minDisplay = $derived(
		unit === 'fahrenheit'
			? celsiusToFahrenheit(effectiveConfig.validRange.min)
			: effectiveConfig.validRange.min
	);
	const maxDisplay = $derived(
		unit === 'fahrenheit'
			? celsiusToFahrenheit(effectiveConfig.validRange.max)
			: effectiveConfig.validRange.max
	);

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const inputValue = parseFloat(input.value);

		if (isNaN(inputValue)) {
			value = null;
			onchange?.(null);
			return;
		}

		// Convert from display unit to Celsius for storage
		const celsius = unit === 'fahrenheit' ? fahrenheitToCelsius(inputValue) : inputValue;
		value = celsius;
		onchange?.(celsius);
	}

	function increment() {
		const step = unit === 'fahrenheit' ? 0.2 : 0.1;
		const currentDisplay = value !== null
			? (unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value)
			: (unit === 'fahrenheit' ? 98.6 : 37.0);
		const newDisplay = Math.min(currentDisplay + step, maxDisplay);
		const newCelsius = unit === 'fahrenheit' ? fahrenheitToCelsius(newDisplay) : newDisplay;
		value = Math.round(newCelsius * 10) / 10;
		onchange?.(value);
	}

	function decrement() {
		const step = unit === 'fahrenheit' ? 0.2 : 0.1;
		const currentDisplay = value !== null
			? (unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value)
			: (unit === 'fahrenheit' ? 98.6 : 37.0);
		const newDisplay = Math.max(currentDisplay - step, minDisplay);
		const newCelsius = unit === 'fahrenheit' ? fahrenheitToCelsius(newDisplay) : newDisplay;
		value = Math.round(newCelsius * 10) / 10;
		onchange?.(value);
	}
</script>

<div class="space-y-2">
	<label class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
		<span class="text-lg">🌡️</span>
		Temperature
	</label>

	<div class="flex items-center gap-2">
		<!-- Decrement Button -->
		<button
			type="button"
			onclick={decrement}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-xl font-bold text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
			aria-label="Decrease temperature"
		>
			−
		</button>

		<!-- Input -->
		<div class="relative flex-1">
			<input
				type="number"
				inputmode="decimal"
				step="0.1"
				min={minDisplay}
				max={maxDisplay}
				value={displayValue}
				oninput={handleInput}
				class="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-center text-2xl font-medium text-neutral-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
				placeholder={unit === 'fahrenheit' ? '98.6' : '37.0'}
				aria-label="Temperature value"
			/>
			<span class="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-neutral-500">
				{unit === 'fahrenheit' ? '°F' : '°C'}
			</span>
		</div>

		<!-- Increment Button -->
		<button
			type="button"
			onclick={increment}
			class="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100 text-xl font-bold text-neutral-600 transition-colors hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
			aria-label="Increase temperature"
		>
			+
		</button>
	</div>

	<!-- Status indicator -->
	{#if status && status !== 'normal'}
		<div class="flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm {statusColor} dark:bg-warning-bg">
			<span>{status === 'hypothermia' ? '❄️' : '🔥'}</span>
			<span>{statusLabel}</span>
		</div>
	{/if}
</div>
