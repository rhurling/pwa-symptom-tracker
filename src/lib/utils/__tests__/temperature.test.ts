import { describe, it, expect } from 'vitest';
import {
	celsiusToFahrenheit,
	fahrenheitToCelsius,
	formatTemperature,
	parseTemperatureInput,
	isValidTemperature,
	getTemperatureStatus,
	getTemperatureStatusLabel,
	getTemperatureStatusColor
} from '../temperature';
import type { TemperatureConfig } from '$types';

describe('Temperature Conversion', () => {
	describe('celsiusToFahrenheit', () => {
		it('converts 0°C to 32°F', () => {
			expect(celsiusToFahrenheit(0)).toBe(32);
		});

		it('converts 100°C to 212°F', () => {
			expect(celsiusToFahrenheit(100)).toBe(212);
		});

		it('converts 37°C to approximately 98.6°F', () => {
			expect(celsiusToFahrenheit(37)).toBeCloseTo(98.6, 1);
		});

		it('handles negative temperatures', () => {
			expect(celsiusToFahrenheit(-40)).toBe(-40); // -40 is same in both scales
		});
	});

	describe('fahrenheitToCelsius', () => {
		it('converts 32°F to 0°C', () => {
			expect(fahrenheitToCelsius(32)).toBe(0);
		});

		it('converts 212°F to 100°C', () => {
			expect(fahrenheitToCelsius(212)).toBe(100);
		});

		it('converts 98.6°F to approximately 37°C', () => {
			expect(fahrenheitToCelsius(98.6)).toBeCloseTo(37, 1);
		});

		it('handles negative temperatures', () => {
			expect(fahrenheitToCelsius(-40)).toBe(-40);
		});
	});
});

describe('formatTemperature', () => {
	it('formats Celsius temperature correctly', () => {
		expect(formatTemperature(37.5, 'celsius')).toBe('37.5°C');
	});

	it('formats Fahrenheit temperature correctly', () => {
		expect(formatTemperature(37, 'fahrenheit')).toBe('98.6°F');
	});

	it('respects decimal places parameter', () => {
		expect(formatTemperature(37.123, 'celsius', 2)).toBe('37.12°C');
		expect(formatTemperature(37.123, 'celsius', 0)).toBe('37°C');
	});
});

describe('parseTemperatureInput', () => {
	it('parses Celsius input directly', () => {
		expect(parseTemperatureInput('37.5', 'celsius')).toBe(37.5);
	});

	it('converts Fahrenheit input to Celsius', () => {
		expect(parseTemperatureInput('98.6', 'fahrenheit')).toBeCloseTo(37, 1);
	});

	it('returns null for invalid input', () => {
		expect(parseTemperatureInput('invalid', 'celsius')).toBeNull();
		expect(parseTemperatureInput('', 'celsius')).toBeNull();
	});
});

describe('isValidTemperature', () => {
	const config: TemperatureConfig = {
		type: 'temperature',
		validRange: { min: 34.0, max: 43.0 },
		defaultThresholds: {
			feverWarning: 37.5,
			feverCritical: 39.0,
			hypoWarning: 35.5
		}
	};

	it('returns true for temperatures within range', () => {
		expect(isValidTemperature(37, config)).toBe(true);
		expect(isValidTemperature(34.0, config)).toBe(true);
		expect(isValidTemperature(43.0, config)).toBe(true);
	});

	it('returns false for temperatures outside range', () => {
		expect(isValidTemperature(33.9, config)).toBe(false);
		expect(isValidTemperature(43.1, config)).toBe(false);
	});
});

describe('getTemperatureStatus', () => {
	const defaultThresholds = {
		feverWarning: 37.5,
		feverCritical: 39.0,
		hypoWarning: 35.5
	};

	it('returns normal for temperatures in normal range', () => {
		expect(getTemperatureStatus(36.5, undefined, defaultThresholds)).toBe('normal');
		expect(getTemperatureStatus(37.4, undefined, defaultThresholds)).toBe('normal');
	});

	it('returns hypothermia for low temperatures', () => {
		expect(getTemperatureStatus(35.0, undefined, defaultThresholds)).toBe('hypothermia');
		expect(getTemperatureStatus(35.4, undefined, defaultThresholds)).toBe('hypothermia');
	});

	it('returns fever for elevated temperatures', () => {
		expect(getTemperatureStatus(37.5, undefined, defaultThresholds)).toBe('fever');
		expect(getTemperatureStatus(38.9, undefined, defaultThresholds)).toBe('fever');
	});

	it('returns high_fever for very high temperatures', () => {
		expect(getTemperatureStatus(39.0, undefined, defaultThresholds)).toBe('high_fever');
		expect(getTemperatureStatus(40.0, undefined, defaultThresholds)).toBe('high_fever');
	});

	it('uses custom thresholds when provided', () => {
		const customThresholds = {
			criticalLow: 34.0,
			warningHigh: 38.0,
			criticalHigh: 40.0
		};
		expect(getTemperatureStatus(37.8, customThresholds, defaultThresholds)).toBe('normal');
		expect(getTemperatureStatus(38.0, customThresholds, defaultThresholds)).toBe('fever');
	});
});

describe('getTemperatureStatusLabel', () => {
	it('returns correct labels for each status', () => {
		expect(getTemperatureStatusLabel('normal')).toBe('Normal');
		expect(getTemperatureStatusLabel('hypothermia')).toBe('Low temperature');
		expect(getTemperatureStatusLabel('fever')).toBe('Fever');
		expect(getTemperatureStatusLabel('high_fever')).toBe('High fever');
	});
});

describe('getTemperatureStatusColor', () => {
	it('returns correct color classes for each status', () => {
		expect(getTemperatureStatusColor('normal')).toBe('text-success');
		expect(getTemperatureStatusColor('hypothermia')).toBe('text-info');
		expect(getTemperatureStatusColor('fever')).toBe('text-warning');
		expect(getTemperatureStatusColor('high_fever')).toBe('text-warning');
	});
});
