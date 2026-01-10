import type { MetricDefinition, FeelingConfig, TemperatureConfig, EventConfig } from '$types';

export function getBuiltInMetrics(): MetricDefinition[] {
	const now = new Date();

	const temperatureMetric: MetricDefinition = {
		id: 'temperature',
		name: 'Body Temperature',
		type: 'temperature',
		isBuiltIn: true,
		config: {
			type: 'temperature',
			validRange: { min: 34.0, max: 43.0 },
			defaultThresholds: {
				feverWarning: 37.5,
				feverCritical: 39.0,
				hypoWarning: 35.5
			}
		} as TemperatureConfig,
		createdAt: now
	};

	const feelingMetric: MetricDefinition = {
		id: 'feeling',
		name: 'General Feeling',
		type: 'feeling',
		isBuiltIn: true,
		config: {
			type: 'feeling',
			emojiScale: [
				{ emoji: '😫', label: 'Terrible', value: 1 },
				{ emoji: '😟', label: 'Poor', value: 2 },
				{ emoji: '😐', label: 'Okay', value: 3 },
				{ emoji: '🙂', label: 'Good', value: 4 },
				{ emoji: '😊', label: 'Great', value: 5 }
			]
		} as FeelingConfig,
		createdAt: now
	};

	const eventMetric: MetricDefinition = {
		id: 'event',
		name: 'Event',
		type: 'event',
		isBuiltIn: true,
		config: {
			type: 'event',
			placeholder: 'What happened?'
		} as EventConfig,
		createdAt: now
	};

	return [temperatureMetric, feelingMetric, eventMetric];
}

export const DEFAULT_USER_SETTINGS = {
	temperatureUnit: 'celsius' as const,
	theme: 'system' as const,
	defaultReminderBehavior: 'smart' as const,
	createdAt: new Date(),
	updatedAt: new Date()
};

export const DEFAULT_REMINDER_CONFIG = {
	enabled: false,
	mode: 'smart' as const,
	smartConfig: {
		acuteIntervalHours: 4,
		recoveryIntervalHours: 8,
		baselineIntervalHours: 24
	},
	promptMetricIds: ['temperature', 'feeling']
};
