<script lang="ts">
	import { goto } from '$app/navigation';
	import { sessions, metrics } from '$stores';
	import { Button, Card, Input } from '$components/common';
	import type { MetricConfig } from '$types';
	import { DEFAULT_REMINDER_CONFIG } from '$db';

	let name = $state('');
	let description = $state('');
	let sessionType = $state<'acute' | 'chronic' | 'monitoring'>('acute');
	let selectedMetrics = $state<Set<string>>(new Set(['temperature', 'feeling']));
	let isSubmitting = $state(false);
	let error = $state('');

	const sessionTypes = [
		{ value: 'acute', label: 'Acute Illness', icon: '⚡', description: 'Short-term illness tracking' },
		{ value: 'chronic', label: 'Chronic Condition', icon: '🔄', description: 'Ongoing condition monitoring' },
		{ value: 'monitoring', label: 'General Monitoring', icon: '📊', description: 'Regular health tracking' }
	] as const;

	function toggleMetric(metricId: string) {
		const newSet = new Set(selectedMetrics);
		if (newSet.has(metricId)) {
			newSet.delete(metricId);
		} else {
			newSet.add(metricId);
		}
		selectedMetrics = newSet;
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Please enter a session name';
			return;
		}

		if (selectedMetrics.size === 0) {
			error = 'Please select at least one metric to track';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const enabledMetrics: MetricConfig[] = Array.from(selectedMetrics).map((metricId) => ({
				metricId,
				includedInReminders: true
			}));

			const session = await sessions.create({
				name: name.trim(),
				description: description.trim() || undefined,
				sessionType,
				enabledMetrics,
				reminderConfig: {
					...DEFAULT_REMINDER_CONFIG,
					promptMetricIds: Array.from(selectedMetrics)
				}
			});

			goto(`/session/${session.id}`);
		} catch (err) {
			console.error('Failed to create session:', err);
			error = 'Failed to create session. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function handleBack() {
		goto('/');
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<button
			onclick={handleBack}
			class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
			aria-label="Go back"
		>
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">New Session</h1>
	</div>

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
		<!-- Session Name -->
		<Input
			label="Session Name"
			placeholder="e.g., Flu - January 2026"
			bind:value={name}
			required
		/>

		<!-- Description -->
		<div class="space-y-1">
			<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Description (optional)
			</label>
			<textarea
				bind:value={description}
				placeholder="Add any notes about this session..."
				rows="2"
				class="input resize-none"
			></textarea>
		</div>

		<!-- Session Type -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Session Type
			</label>
			<div class="grid gap-2">
				{#each sessionTypes as type}
					<button
						type="button"
						onclick={() => sessionType = type.value}
						class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {sessionType === type.value
							? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
							: 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
					>
						<span class="text-2xl">{type.icon}</span>
						<div>
							<p class="font-medium text-neutral-800 dark:text-neutral-100">{type.label}</p>
							<p class="text-xs text-neutral-500 dark:text-neutral-400">{type.description}</p>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Metrics Selection -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Metrics to Track
			</label>
			<div class="space-y-2">
				{#each $metrics as metric (metric.id)}
					<button
						type="button"
						onclick={() => toggleMetric(metric.id)}
						class="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors {selectedMetrics.has(metric.id)
							? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
							: 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
					>
						<div class="flex h-5 w-5 items-center justify-center rounded border {selectedMetrics.has(metric.id)
							? 'border-primary-500 bg-primary-500 text-white'
							: 'border-neutral-300 dark:border-neutral-600'}">
							{#if selectedMetrics.has(metric.id)}
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							{/if}
						</div>
						<div>
							<p class="font-medium text-neutral-800 dark:text-neutral-100">{metric.name}</p>
							{#if metric.isBuiltIn}
								<p class="text-xs text-neutral-500 dark:text-neutral-400">Built-in</p>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Error message -->
		{#if error}
			<p class="text-sm text-warning" role="alert">{error}</p>
		{/if}

		<!-- Submit -->
		<Button type="submit" class="w-full" loading={isSubmitting}>
			Create Session
		</Button>
	</form>
</div>
