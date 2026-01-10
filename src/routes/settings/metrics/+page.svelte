<script lang="ts">
	import { goto } from '$app/navigation';
	import { metrics } from '$stores';
	import { Button, Card, Modal, Input, EmptyState } from '$components/common';
	import { db } from '$db';
	import type { MetricDefinition, MetricType, NumericConfig, ScaleConfig, EventConfig } from '$types';

	// Modal state
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let editingMetric = $state<MetricDefinition | null>(null);

	// Form state
	let metricName = $state('');
	let metricType = $state<'numeric' | 'scale' | 'event'>('numeric');

	// Numeric config
	let numericUnit = $state('');
	let numericMin = $state<number | undefined>(undefined);
	let numericMax = $state<number | undefined>(undefined);
	let numericDecimals = $state(0);

	// Scale config
	let scaleMin = $state(1);
	let scaleMax = $state(10);
	let scaleMinLabel = $state('Low');
	let scaleMaxLabel = $state('High');
	let scaleStep = $state(1);

	// Event config
	let eventPlaceholder = $state('What happened?');

	let isSubmitting = $state(false);
	let error = $state('');

	// Custom metrics only (non-built-in)
	const customMetrics = $derived($metrics.filter((m) => !m.isBuiltIn));
	const builtInMetrics = $derived($metrics.filter((m) => m.isBuiltIn));

	function handleBack() {
		goto('/settings');
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(metric: MetricDefinition) {
		editingMetric = metric;
		metricName = metric.name;

		if (metric.config.type === 'numeric') {
			metricType = 'numeric';
			numericUnit = metric.config.unit;
			numericMin = metric.config.validRange?.min;
			numericMax = metric.config.validRange?.max;
			numericDecimals = metric.config.decimalPlaces;
		} else if (metric.config.type === 'scale') {
			metricType = 'scale';
			scaleMin = metric.config.min;
			scaleMax = metric.config.max;
			scaleMinLabel = metric.config.minLabel;
			scaleMaxLabel = metric.config.maxLabel;
			scaleStep = metric.config.step;
		} else if (metric.config.type === 'event') {
			metricType = 'event';
			eventPlaceholder = metric.config.placeholder;
		}

		showEditModal = true;
	}

	function openDeleteModal(metric: MetricDefinition) {
		editingMetric = metric;
		showDeleteModal = true;
	}

	function resetForm() {
		metricName = '';
		metricType = 'numeric';
		numericUnit = '';
		numericMin = undefined;
		numericMax = undefined;
		numericDecimals = 0;
		scaleMin = 1;
		scaleMax = 10;
		scaleMinLabel = 'Low';
		scaleMaxLabel = 'High';
		scaleStep = 1;
		eventPlaceholder = 'What happened?';
		error = '';
		editingMetric = null;
	}

	function buildConfig(): NumericConfig | ScaleConfig | EventConfig {
		switch (metricType) {
			case 'numeric':
				return {
					type: 'numeric',
					unit: numericUnit,
					validRange: numericMin !== undefined && numericMax !== undefined
						? { min: numericMin, max: numericMax }
						: undefined,
					decimalPlaces: numericDecimals
				};
			case 'scale':
				return {
					type: 'scale',
					min: scaleMin,
					max: scaleMax,
					minLabel: scaleMinLabel,
					maxLabel: scaleMaxLabel,
					step: scaleStep
				};
			case 'event':
				return {
					type: 'event',
					placeholder: eventPlaceholder
				};
		}
	}

	async function handleCreate() {
		if (!metricName.trim()) {
			error = 'Please enter a metric name';
			return;
		}

		// Check for duplicate name
		const existingMetric = $metrics.find(
			(m) => m.name.toLowerCase() === metricName.trim().toLowerCase()
		);
		if (existingMetric) {
			error = 'A metric with this name already exists';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const id = `custom-${Date.now()}`;
			const newMetric: MetricDefinition = {
				id,
				name: metricName.trim(),
				type: metricType,
				isBuiltIn: false,
				config: buildConfig(),
				createdAt: new Date()
			};

			await db.metrics.add(newMetric);
			await metrics.load();
			showCreateModal = false;
			resetForm();
		} catch (err) {
			console.error('Failed to create metric:', err);
			error = 'Failed to create metric. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleUpdate() {
		if (!editingMetric) return;

		if (!metricName.trim()) {
			error = 'Please enter a metric name';
			return;
		}

		// Check for duplicate name (excluding current metric)
		const existingMetric = $metrics.find(
			(m) => m.id !== editingMetric!.id && m.name.toLowerCase() === metricName.trim().toLowerCase()
		);
		if (existingMetric) {
			error = 'A metric with this name already exists';
			return;
		}

		isSubmitting = true;
		error = '';

		try {
			const updatedMetric: MetricDefinition = {
				...editingMetric,
				name: metricName.trim(),
				type: metricType,
				config: buildConfig()
			};

			await db.metrics.put(updatedMetric);
			await metrics.load();
			showEditModal = false;
			resetForm();
		} catch (err) {
			console.error('Failed to update metric:', err);
			error = 'Failed to update metric. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!editingMetric) return;

		isSubmitting = true;

		try {
			await db.metrics.delete(editingMetric.id);
			await metrics.load();
			showDeleteModal = false;
			resetForm();
		} catch (err) {
			console.error('Failed to delete metric:', err);
		} finally {
			isSubmitting = false;
		}
	}

	function getMetricIcon(type: MetricType): string {
		switch (type) {
			case 'temperature':
				return '🌡️';
			case 'feeling':
				return '😐';
			case 'event':
				return '📝';
			case 'numeric':
				return '🔢';
			case 'scale':
				return '📊';
			default:
				return '📋';
		}
	}

	function getTypeLabel(type: MetricType): string {
		switch (type) {
			case 'temperature':
				return 'Temperature';
			case 'feeling':
				return 'Feeling Scale';
			case 'event':
				return 'Event/Note';
			case 'numeric':
				return 'Numeric Value';
			case 'scale':
				return 'Scale';
			default:
				return type;
		}
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
		<h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100">Custom Metrics</h1>
	</div>

	<p class="text-sm text-neutral-500 dark:text-neutral-400">
		Create custom metrics to track additional data points in your sessions.
	</p>

	<!-- Built-in Metrics Section -->
	<div>
		<h2 class="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Built-in Metrics</h2>
		<div class="space-y-2">
			{#each builtInMetrics as metric (metric.id)}
				<Card padding="sm">
					<div class="flex items-center gap-3">
						<span class="text-xl">{getMetricIcon(metric.type)}</span>
						<div class="flex-1">
							<p class="font-medium text-neutral-800 dark:text-neutral-100">{metric.name}</p>
							<p class="text-xs text-neutral-500">{getTypeLabel(metric.type)}</p>
						</div>
						<span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700">
							Built-in
						</span>
					</div>
				</Card>
			{/each}
		</div>
	</div>

	<!-- Custom Metrics Section -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Your Custom Metrics</h2>
			<Button size="sm" onclick={openCreateModal}>+ Add Metric</Button>
		</div>

		{#if customMetrics.length === 0}
			<Card class="text-center">
				<p class="text-neutral-500 dark:text-neutral-400">No custom metrics yet</p>
				<p class="mt-1 text-xs text-neutral-400">
					Create custom metrics to track things like medication doses, pain levels, or other symptoms.
				</p>
			</Card>
		{:else}
			<div class="space-y-2">
				{#each customMetrics as metric (metric.id)}
					<Card padding="sm" variant="interactive" onclick={() => openEditModal(metric)}>
						<div class="flex items-center gap-3">
							<span class="text-xl">{getMetricIcon(metric.type)}</span>
							<div class="flex-1">
								<p class="font-medium text-neutral-800 dark:text-neutral-100">{metric.name}</p>
								<p class="text-xs text-neutral-500">{getTypeLabel(metric.type)}</p>
							</div>
							<svg class="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Create Modal -->
<Modal bind:open={showCreateModal} title="Create Custom Metric">
	<div class="space-y-4">
		<Input
			label="Metric Name"
			placeholder="e.g., Pain Level, Medication Dose"
			bind:value={metricName}
			required
		/>

		<div class="space-y-2">
			<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Metric Type
			</span>
			<div class="grid grid-cols-3 gap-2">
				{#each [
					{ value: 'numeric', label: 'Numeric', icon: '🔢' },
					{ value: 'scale', label: 'Scale', icon: '📊' },
					{ value: 'event', label: 'Event', icon: '📝' }
				] as type}
					<button
						type="button"
						onclick={() => metricType = type.value as typeof metricType}
						class="flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors {metricType === type.value
							? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
							: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
					>
						<span class="text-xl">{type.icon}</span>
						<span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">{type.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Type-specific config -->
		{#if metricType === 'numeric'}
			<Input
				label="Unit (optional)"
				placeholder="e.g., mg, ml, hours"
				bind:value={numericUnit}
			/>
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Value (optional)"
					type="number"
					bind:value={numericMin}
				/>
				<Input
					label="Max Value (optional)"
					type="number"
					bind:value={numericMax}
				/>
			</div>
			<div class="space-y-2">
				<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
					Decimal Places
				</span>
				<select bind:value={numericDecimals} class="input">
					<option value={0}>0 (whole numbers)</option>
					<option value={1}>1 decimal place</option>
					<option value={2}>2 decimal places</option>
				</select>
			</div>
		{:else if metricType === 'scale'}
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Value"
					type="number"
					bind:value={scaleMin}
				/>
				<Input
					label="Max Value"
					type="number"
					bind:value={scaleMax}
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Label"
					placeholder="e.g., None, Low"
					bind:value={scaleMinLabel}
				/>
				<Input
					label="Max Label"
					placeholder="e.g., Severe, High"
					bind:value={scaleMaxLabel}
				/>
			</div>
		{:else if metricType === 'event'}
			<Input
				label="Placeholder Text"
				placeholder="e.g., What medication did you take?"
				bind:value={eventPlaceholder}
			/>
		{/if}

		{#if error}
			<p class="text-sm text-warning" role="alert">{error}</p>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="secondary" class="flex-1" onclick={() => { showCreateModal = false; resetForm(); }}>
				Cancel
			</Button>
			<Button class="flex-1" onclick={handleCreate} loading={isSubmitting}>
				Create Metric
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Edit Modal -->
<Modal bind:open={showEditModal} title="Edit Custom Metric">
	<div class="space-y-4">
		<Input
			label="Metric Name"
			placeholder="e.g., Pain Level, Medication Dose"
			bind:value={metricName}
			required
		/>

		<div class="space-y-2">
			<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Metric Type
			</span>
			<div class="grid grid-cols-3 gap-2">
				{#each [
					{ value: 'numeric', label: 'Numeric', icon: '🔢' },
					{ value: 'scale', label: 'Scale', icon: '📊' },
					{ value: 'event', label: 'Event', icon: '📝' }
				] as type}
					<button
						type="button"
						onclick={() => metricType = type.value as typeof metricType}
						class="flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors {metricType === type.value
							? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
							: 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700'}"
					>
						<span class="text-xl">{type.icon}</span>
						<span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">{type.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Type-specific config -->
		{#if metricType === 'numeric'}
			<Input
				label="Unit (optional)"
				placeholder="e.g., mg, ml, hours"
				bind:value={numericUnit}
			/>
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Value (optional)"
					type="number"
					bind:value={numericMin}
				/>
				<Input
					label="Max Value (optional)"
					type="number"
					bind:value={numericMax}
				/>
			</div>
			<div class="space-y-2">
				<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
					Decimal Places
				</span>
				<select bind:value={numericDecimals} class="input">
					<option value={0}>0 (whole numbers)</option>
					<option value={1}>1 decimal place</option>
					<option value={2}>2 decimal places</option>
				</select>
			</div>
		{:else if metricType === 'scale'}
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Value"
					type="number"
					bind:value={scaleMin}
				/>
				<Input
					label="Max Value"
					type="number"
					bind:value={scaleMax}
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<Input
					label="Min Label"
					placeholder="e.g., None, Low"
					bind:value={scaleMinLabel}
				/>
				<Input
					label="Max Label"
					placeholder="e.g., Severe, High"
					bind:value={scaleMaxLabel}
				/>
			</div>
		{:else if metricType === 'event'}
			<Input
				label="Placeholder Text"
				placeholder="e.g., What medication did you take?"
				bind:value={eventPlaceholder}
			/>
		{/if}

		{#if error}
			<p class="text-sm text-warning" role="alert">{error}</p>
		{/if}
	</div>

	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="ghost" class="text-warning" onclick={() => { showEditModal = false; openDeleteModal(editingMetric!); }}>
				Delete
			</Button>
			<div class="flex-1"></div>
			<Button variant="secondary" onclick={() => { showEditModal = false; resetForm(); }}>
				Cancel
			</Button>
			<Button onclick={handleUpdate} loading={isSubmitting}>
				Save Changes
			</Button>
		</div>
	{/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal bind:open={showDeleteModal} title="Delete Metric">
	<p class="text-neutral-600 dark:text-neutral-300">
		Are you sure you want to delete "{editingMetric?.name}"? This action cannot be undone.
	</p>
	<p class="mt-2 text-sm text-neutral-500">
		Note: Existing entries using this metric will be preserved but may display differently.
	</p>

	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="secondary" class="flex-1" onclick={() => { showDeleteModal = false; resetForm(); }}>
				Cancel
			</Button>
			<Button variant="danger" class="flex-1" onclick={handleDelete} loading={isSubmitting}>
				Delete Metric
			</Button>
		</div>
	{/snippet}
</Modal>
