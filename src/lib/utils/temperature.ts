import type { ThresholdConfig, TemperatureConfig } from '$types';

export function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
	return ((fahrenheit - 32) * 5) / 9;
}

export function formatTemperature(
	celsius: number,
	unit: 'celsius' | 'fahrenheit',
	decimals: number = 1
): string {
	const value = unit === 'fahrenheit' ? celsiusToFahrenheit(celsius) : celsius;
	const symbol = unit === 'fahrenheit' ? '°F' : '°C';
	return `${value.toFixed(decimals)}${symbol}`;
}

export function parseTemperatureInput(
	input: string,
	unit: 'celsius' | 'fahrenheit'
): number | null {
	const value = parseFloat(input);
	if (isNaN(value)) return null;
	return unit === 'fahrenheit' ? fahrenheitToCelsius(value) : value;
}

export function isValidTemperature(celsius: number, config: TemperatureConfig): boolean {
	return celsius >= config.validRange.min && celsius <= config.validRange.max;
}

export type TemperatureStatus = 'normal' | 'hypothermia' | 'fever' | 'high_fever';

export function getTemperatureStatus(
	celsius: number,
	thresholds?: ThresholdConfig,
	defaultThresholds?: TemperatureConfig['defaultThresholds']
): TemperatureStatus {
	const hypoWarning = thresholds?.criticalLow ?? defaultThresholds?.hypoWarning ?? 35.5;
	const feverWarning = thresholds?.warningHigh ?? defaultThresholds?.feverWarning ?? 37.5;
	const feverCritical = thresholds?.criticalHigh ?? defaultThresholds?.feverCritical ?? 39.0;

	if (celsius < hypoWarning) return 'hypothermia';
	if (celsius >= feverCritical) return 'high_fever';
	if (celsius >= feverWarning) return 'fever';
	return 'normal';
}

export function getTemperatureStatusLabel(status: TemperatureStatus): string {
	switch (status) {
		case 'hypothermia':
			return 'Low temperature';
		case 'fever':
			return 'Fever';
		case 'high_fever':
			return 'High fever';
		default:
			return 'Normal';
	}
}

export function getTemperatureStatusColor(status: TemperatureStatus): string {
	switch (status) {
		case 'hypothermia':
			return 'text-info';
		case 'fever':
			return 'text-warning';
		case 'high_fever':
			return 'text-warning';
		default:
			return 'text-success';
	}
}
