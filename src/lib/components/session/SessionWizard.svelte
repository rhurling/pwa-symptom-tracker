<script lang="ts">
	import type { TrackingSession, MetricDefinition, MetricConfig, ReminderConfig, ThresholdConfig } from '$types';
	import { Button, Card, Input, Modal } from '$components/common';

	interface Props {
		metrics: MetricDefinition[];
		onComplete: (session: Partial<TrackingSession>) => void;
		onCancel: () => void;
	}

	let { metrics, onComplete, onCancel }: Props = $props();

	// Wizard state
	let currentStep = $state(1);
	const totalSteps = 5;

	// Step 1: Basics
	let name = $state('');
	let description = $state('');
	let sessionType = $state<'acute' | 'chronic' | 'monitoring'>('acute');

	// Step 2: Metrics
	let selectedMetrics = $state<Set<string>>(new Set(['temperature', 'feeling']));

	// Step 3: Thresholds
	let thresholds = $state<Map<string, ThresholdConfig>>(new Map());

	// Step 4: Reminders
	let reminderEnabled = $state(true);
	let reminderMode = $state<'smart' | 'scheduled'>('smart');
	let scheduledTimes = $state<string[]>(['09:00', '21:00']);

	// Validation
	const step1Valid = $derived(name.trim().length > 0);
	const step2Valid = $derived(selectedMetrics.size > 0);

	function getStepTitle(step: number): string {
		switch (step) {
			case 1: return 'Basics';
			case 2: return 'Metrics';
			case 3: return 'Thresholds';
			case 4: return 'Reminders';
			case 5: return 'Review';
			default: return '';
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function toggleMetric(metricId: string) {
		const newSet = new Set(selectedMetrics);
		if (newSet.has(metricId)) {
			newSet.delete(metricId);
		} else {
			newSet.add(metricId);
		}
		selectedMetrics = newSet;
	}

	function getMetricIcon(metricId: string): string {
		switch (metricId) {
			case 'temperature': return '🌡️';
			case 'feeling': return '😐';
			case 'event': return '📝';
			default: return '📊';
		}
	}

	function addScheduledTime() {
		scheduledTimes = [...scheduledTimes, '12:00'];
	}

	function removeScheduledTime(index: number) {
		scheduledTimes = scheduledTimes.filter((_, i) => i !== index);
	}

	function updateScheduledTime(index: number, value: string) {
		scheduledTimes = scheduledTimes.map((t, i) => (i === index ? value : t));
	}

	function handleComplete() {
		// Build enabled metrics config
		const enabledMetrics: MetricConfig[] = Array.from(selectedMetrics).map((metricId) => ({
			metricId,
			includedInReminders: true,
			thresholds: thresholds.get(metricId)
		}));

		// Build reminder config
		const reminderConfig: ReminderConfig = {
			enabled: reminderEnabled,
			mode: reminderMode,
			scheduledTimes: reminderMode === 'scheduled' ? scheduledTimes : undefined,
			smartConfig: reminderMode === 'smart' ? {
				acuteIntervalHours: 4,
				recoveryIntervalHours: 8,
				baselineIntervalHours: 24
			} : undefined,
			promptMetricIds: Array.from(selectedMetrics)
		};

		onComplete({
			name: name.trim(),
			description: description.trim() || undefined,
			sessionType,
			enabledMetrics,
			reminderConfig,
			status: 'active'
		});
	}

	function canProceed(): boolean {
		switch (currentStep) {
			case 1: return step1Valid;
			case 2: return step2Valid;
			case 3: return true;
			case 4: return true;
			case 5: return true;
			default: return false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Progress indicator -->
	<div class="relative">
		<div class="flex justify-between">
			{#each Array(totalSteps) as _, i}
				<div class="flex flex-col items-center">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors {i + 1 <= currentStep
							? 'bg-primary-500 text-white'
							: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'}"
					>
						{i + 1}
					</div>
					<span class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 {i + 1 === currentStep ? 'font-medium' : ''}">
						{getStepTitle(i + 1)}
					</span>
				</div>
			{/each}
		</div>
		<!-- Progress line -->
		<div class="absolute left-4 right-4 top-4 -z-10 h-0.5 bg-neutral-200 dark:bg-neutral-700">
			<div
				class="h-full bg-primary-500 transition-all"
				style="width: {((currentStep - 1) / (totalSteps - 1)) * 100}%"
			></div>
		</div>
	</div>

	<!-- Step content -->
	<div class="min-h-[300px]">
		{#if currentStep === 1}
			<!-- Step 1: Basics -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">What are you tracking?</h2>

				<Input
					label="Session Name"
					placeholder="e.g., Cold symptoms, Allergy tracking"
					bind:value={name}
					required
				/>

				<Input
					label="Description (optional)"
					placeholder="Add any notes about this session"
					bind:value={description}
				/>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Session Type
					</label>
					<div class="grid grid-cols-3 gap-2">
						{#each [
							{ value: 'acute', label: 'Acute', desc: 'Short-term illness' },
							{ value: 'chronic', label: 'Chronic', desc: 'Ongoing condition' },
							{ value: 'monitoring', label: 'Monitoring', desc: 'General tracking' }
						] as type}
							<button
								onclick={() => sessionType = type.value as typeof sessionType}
								class="rounded-lg border p-3 text-left transition-colors {sessionType === type.value
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
							>
								<p class="font-medium text-neutral-800 dark:text-neutral-100">{type.label}</p>
								<p class="text-xs text-neutral-500">{type.desc}</p>
							</button>
						{/each}
					</div>
				</div>
			</div>

		{:else if currentStep === 2}
			<!-- Step 2: Select Metrics -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">What do you want to track?</h2>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">Select the metrics you want to log for this session.</p>

				<div class="space-y-2">
					{#each metrics as metric (metric.id)}
						<button
							onclick={() => toggleMetric(metric.id)}
							class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedMetrics.has(metric.id)
								? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
								: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
						>
							<div class="flex h-5 w-5 items-center justify-center rounded border {selectedMetrics.has(metric.id)
								? 'border-primary-500 bg-primary-500'
								: 'border-neutral-300 dark:border-neutral-600'}">
								{#if selectedMetrics.has(metric.id)}
									<svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
								{/if}
							</div>
							<span class="text-xl">{getMetricIcon(metric.id)}</span>
							<div>
								<p class="font-medium text-neutral-800 dark:text-neutral-100">{metric.name}</p>
								<p class="text-xs text-neutral-500">{metric.type}</p>
							</div>
						</button>
					{/each}
				</div>
			</div>

		{:else if currentStep === 3}
			<!-- Step 3: Configure Thresholds -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Configure Thresholds</h2>
				<p class="text-sm text-neutral-500 dark:text-neutral-400">
					Set optional warning thresholds for your metrics. You can skip this step.
				</p>

				{#if selectedMetrics.has('temperature')}
					<Card>
						<h3 class="mb-3 flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
							<span>🌡️</span> Temperature
						</h3>
						<p class="mb-3 text-sm text-neutral-500">Default thresholds: Fever warning at 37.8°C, High fever at 39.4°C</p>
						<p class="text-sm text-neutral-400">Using default thresholds (customization coming soon)</p>
					</Card>
				{/if}

				{#if !selectedMetrics.has('temperature')}
					<Card class="text-center">
						<p class="text-neutral-500">No threshold-enabled metrics selected.</p>
					</Card>
				{/if}
			</div>

		{:else if currentStep === 4}
			<!-- Step 4: Reminders -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Set Up Reminders</h2>

				<label class="flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={reminderEnabled}
						class="h-5 w-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
					/>
					<span class="text-neutral-700 dark:text-neutral-300">Enable reminders</span>
				</label>

				{#if reminderEnabled}
					<div class="space-y-3">
						<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Reminder Type
						</label>
						<div class="grid grid-cols-2 gap-2">
							<button
								onclick={() => reminderMode = 'smart'}
								class="rounded-lg border p-3 text-left transition-colors {reminderMode === 'smart'
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
							>
								<p class="font-medium text-neutral-800 dark:text-neutral-100">Smart</p>
								<p class="text-xs text-neutral-500">Adapts to symptom severity</p>
							</button>
							<button
								onclick={() => reminderMode = 'scheduled'}
								class="rounded-lg border p-3 text-left transition-colors {reminderMode === 'scheduled'
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
							>
								<p class="font-medium text-neutral-800 dark:text-neutral-100">Scheduled</p>
								<p class="text-xs text-neutral-500">Fixed times each day</p>
							</button>
						</div>

						{#if reminderMode === 'scheduled'}
							<div class="space-y-2">
								<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
									Reminder Times
								</label>
								{#each scheduledTimes as time, index}
									<div class="flex items-center gap-2">
										<input
											type="time"
											value={time}
											onchange={(e) => updateScheduledTime(index, (e.target as HTMLInputElement).value)}
											class="input flex-1"
										/>
										<button
											onclick={() => removeScheduledTime(index)}
											class="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
											disabled={scheduledTimes.length <= 1}
										>
											<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								{/each}
								<Button variant="ghost" size="sm" onclick={addScheduledTime}>
									+ Add Time
								</Button>
							</div>
						{/if}

						{#if reminderMode === 'smart'}
							<Card class="bg-neutral-50 dark:bg-neutral-800/50">
								<p class="text-sm text-neutral-600 dark:text-neutral-400">
									Smart reminders will adjust based on your symptoms:
								</p>
								<ul class="mt-2 space-y-1 text-xs text-neutral-500">
									<li>• Every 4 hours during acute phase</li>
									<li>• Every 8 hours during recovery</li>
									<li>• Daily for baseline monitoring</li>
								</ul>
							</Card>
						{/if}
					</div>
				{/if}
			</div>

		{:else if currentStep === 5}
			<!-- Step 5: Review -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Review & Create</h2>

				<Card>
					<div class="space-y-3">
						<div>
							<p class="text-xs text-neutral-500">Name</p>
							<p class="font-medium text-neutral-800 dark:text-neutral-100">{name}</p>
						</div>

						{#if description}
							<div>
								<p class="text-xs text-neutral-500">Description</p>
								<p class="text-neutral-700 dark:text-neutral-300">{description}</p>
							</div>
						{/if}

						<div>
							<p class="text-xs text-neutral-500">Type</p>
							<p class="text-neutral-700 dark:text-neutral-300 capitalize">{sessionType}</p>
						</div>

						<div>
							<p class="text-xs text-neutral-500">Metrics</p>
							<div class="mt-1 flex flex-wrap gap-2">
								{#each Array.from(selectedMetrics) as metricId}
									{@const metric = metrics.find((m) => m.id === metricId)}
									{#if metric}
										<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-700">
											{getMetricIcon(metricId)} {metric.name}
										</span>
									{/if}
								{/each}
							</div>
						</div>

						<div>
							<p class="text-xs text-neutral-500">Reminders</p>
							<p class="text-neutral-700 dark:text-neutral-300">
								{#if reminderEnabled}
									{reminderMode === 'smart' ? 'Smart reminders enabled' : `Scheduled at ${scheduledTimes.join(', ')}`}
								{:else}
									Disabled
								{/if}
							</p>
						</div>
					</div>
				</Card>
			</div>
		{/if}
	</div>

	<!-- Navigation buttons -->
	<div class="flex gap-3">
		{#if currentStep === 1}
			<Button variant="secondary" class="flex-1" onclick={onCancel}>
				Cancel
			</Button>
		{:else}
			<Button variant="secondary" class="flex-1" onclick={prevStep}>
				Back
			</Button>
		{/if}

		{#if currentStep < totalSteps}
			<Button class="flex-1" onclick={nextStep} disabled={!canProceed()}>
				Next
			</Button>
		{:else}
			<Button class="flex-1" onclick={handleComplete}>
				Create Session
			</Button>
		{/if}
	</div>
</div>
