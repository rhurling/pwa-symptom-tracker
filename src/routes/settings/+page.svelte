<script lang="ts">
	import { goto } from '$app/navigation';
	import { settings } from '$stores';
	import { Card, Button, Modal } from '$components/common';
	import { db } from '$db';
	import type { ExportData } from '$types';

	let showImportModal = $state(false);
	let importError = $state('');
	let importSuccess = $state(false);
	let fileInput: HTMLInputElement;

	const themes = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	] as const;

	const units = [
		{ value: 'celsius', label: 'Celsius (°C)' },
		{ value: 'fahrenheit', label: 'Fahrenheit (°F)' }
	] as const;

	async function handleExportJson() {
		try {
			const [settingsData, sessionsData, metricsData, entriesData] = await Promise.all([
				db.getSettings(),
				db.sessions.toArray(),
				db.metrics.filter((m) => !m.isBuiltIn).toArray(),
				db.entries.toArray()
			]);

			const exportData: ExportData = {
				exportVersion: '1.0',
				exportedAt: new Date().toISOString(),
				appVersion: '1.0.0',
				data: {
					settings: settingsData!,
					customMetrics: metricsData,
					sessions: sessionsData,
					entries: entriesData
				}
			};

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `symptom-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Export failed:', error);
		}
	}

	function handleImportClick() {
		fileInput?.click();
	}

	function validateAndParseImportData(data: unknown): ExportData {
		// Basic structure validation
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid export file format');
		}

		const exportData = data as Record<string, unknown>;

		if (!exportData.exportVersion || typeof exportData.exportVersion !== 'string') {
			throw new Error('Missing or invalid export version');
		}

		if (!exportData.data || typeof exportData.data !== 'object') {
			throw new Error('Missing data section in export file');
		}

		const innerData = exportData.data as Record<string, unknown>;

		// Validate and parse sessions
		if (innerData.sessions && Array.isArray(innerData.sessions)) {
			for (const session of innerData.sessions) {
				if (!session.id || typeof session.id !== 'string') {
					throw new Error('Invalid session: missing id');
				}
				if (!session.name || typeof session.name !== 'string') {
					throw new Error('Invalid session: missing name');
				}
				if (!['active', 'paused', 'resolved'].includes(session.status)) {
					throw new Error(`Invalid session status: ${session.status}`);
				}
				// Convert date strings to Date objects
				if (session.createdAt) session.createdAt = new Date(session.createdAt);
				if (session.updatedAt) session.updatedAt = new Date(session.updatedAt);
				if (session.resolvedAt) session.resolvedAt = new Date(session.resolvedAt);
			}
		}

		// Validate and parse entries
		if (innerData.entries && Array.isArray(innerData.entries)) {
			for (const entry of innerData.entries) {
				if (!entry.id || typeof entry.id !== 'string') {
					throw new Error('Invalid entry: missing id');
				}
				if (!entry.sessionId || typeof entry.sessionId !== 'string') {
					throw new Error('Invalid entry: missing sessionId');
				}
				if (!entry.metricId || typeof entry.metricId !== 'string') {
					throw new Error('Invalid entry: missing metricId');
				}
				if (!entry.value || typeof entry.value !== 'object') {
					throw new Error('Invalid entry: missing or invalid value');
				}
				// Convert date strings to Date objects
				if (entry.timestamp) entry.timestamp = new Date(entry.timestamp);
				if (entry.createdAt) entry.createdAt = new Date(entry.createdAt);
				if (entry.updatedAt) entry.updatedAt = new Date(entry.updatedAt);
			}
		}

		// Validate and parse custom metrics
		if (innerData.customMetrics && Array.isArray(innerData.customMetrics)) {
			for (const metric of innerData.customMetrics) {
				if (!metric.id || typeof metric.id !== 'string') {
					throw new Error('Invalid metric: missing id');
				}
				if (!metric.name || typeof metric.name !== 'string') {
					throw new Error('Invalid metric: missing name');
				}
				// Convert date strings to Date objects
				if (metric.createdAt) metric.createdAt = new Date(metric.createdAt);
			}
		}

		// Validate and parse settings
		if (innerData.settings && typeof innerData.settings === 'object') {
			const s = innerData.settings as Record<string, unknown>;
			if (s.createdAt) s.createdAt = new Date(s.createdAt as string);
			if (s.updatedAt) s.updatedAt = new Date(s.updatedAt as string);
		}

		return exportData as unknown as ExportData;
	}

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importError = '';
		importSuccess = false;

		try {
			const text = await file.text();
			const rawData = JSON.parse(text);
			const data = validateAndParseImportData(rawData);

			// Import data
			if (data.data.sessions?.length > 0) {
				await db.sessions.bulkPut(data.data.sessions);
			}
			if (data.data.entries?.length > 0) {
				await db.entries.bulkPut(data.data.entries);
			}
			if (data.data.customMetrics?.length > 0) {
				await db.metrics.bulkPut(data.data.customMetrics);
			}
			if (data.data.settings) {
				await db.saveSettings(data.data.settings);
				await settings.load();
			}

			importSuccess = true;
			showImportModal = true;
		} catch (error) {
			console.error('Import failed:', error);
			importError = error instanceof Error ? error.message : 'Failed to import data';
			showImportModal = true;
		}

		// Reset file input
		input.value = '';
	}

	async function handleClearData() {
		if (confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
			await db.entries.clear();
			await db.sessions.clear();
			await db.metrics.filter((m) => !m.isBuiltIn).delete();
			window.location.reload();
		}
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Settings</h1>

	<!-- Display -->
	<Card>
		<h2 class="mb-4 font-semibold text-neutral-800 dark:text-neutral-100">Display</h2>

		<div class="space-y-4">
			<!-- Temperature Unit -->
			<div class="space-y-2">
				<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
					Temperature Unit
				</label>
				<div class="flex gap-2">
					{#each units as unit}
						<button
							onclick={() => settings.setTemperatureUnit(unit.value)}
							class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {$settings.temperatureUnit === unit.value
								? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
								: 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'}"
						>
							{unit.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Theme -->
			<div class="space-y-2">
				<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
					Theme
				</label>
				<div class="flex gap-2">
					{#each themes as theme}
						<button
							onclick={() => settings.setTheme(theme.value)}
							class="flex-1 rounded-lg border px-3 py-2 text-sm transition-colors {$settings.theme === theme.value
								? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
								: 'border-neutral-200 text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:text-neutral-300'}"
						>
							{theme.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</Card>

	<!-- Configuration Links -->
	<Card>
		<h2 class="mb-4 font-semibold text-neutral-800 dark:text-neutral-100">Configuration</h2>
		<div class="space-y-2">
			<button
				onclick={() => goto('/settings/metrics')}
				class="flex w-full items-center gap-3 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
			>
				<span class="text-xl">📊</span>
				<div class="flex-1">
					<p class="font-medium text-neutral-800 dark:text-neutral-100">Custom Metrics</p>
					<p class="text-xs text-neutral-500">Create and manage custom tracking metrics</p>
				</div>
				<svg class="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>

			<button
				onclick={() => goto('/settings/notifications')}
				class="flex w-full items-center gap-3 rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
			>
				<span class="text-xl">🔔</span>
				<div class="flex-1">
					<p class="font-medium text-neutral-800 dark:text-neutral-100">Notifications</p>
					<p class="text-xs text-neutral-500">Configure reminder notifications</p>
				</div>
				<svg class="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	</Card>

	<!-- Data -->
	<Card>
		<h2 class="mb-4 font-semibold text-neutral-800 dark:text-neutral-100">Data</h2>

		<div class="space-y-3">
			<Button variant="secondary" class="w-full" onclick={handleExportJson}>
				Export All Data (JSON)
			</Button>

			<input
				type="file"
				accept=".json"
				class="hidden"
				bind:this={fileInput}
				onchange={handleFileSelect}
			/>
			<Button variant="secondary" class="w-full" onclick={handleImportClick}>
				Import Data
			</Button>

			<Button variant="ghost" class="w-full text-warning" onclick={handleClearData}>
				Clear All Data
			</Button>
		</div>
	</Card>

	<!-- Privacy Notice -->
	<Card>
		<div class="flex items-start gap-3">
			<span class="text-2xl">🔒</span>
			<div>
				<h2 class="font-semibold text-neutral-800 dark:text-neutral-100">Privacy Notice</h2>
				<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
					Your data never leaves your device. All information is stored locally and is only shared when you explicitly export it.
				</p>
				<ul class="mt-2 space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
					<li>✓ All data stored on your device</li>
					<li>✓ No accounts or sign-ups</li>
					<li>✓ No data sent to any server</li>
					<li>✓ No analytics or tracking</li>
					<li>✓ You control all exports</li>
				</ul>
			</div>
		</div>
	</Card>

	<!-- About -->
	<Card>
		<h2 class="mb-2 font-semibold text-neutral-800 dark:text-neutral-100">About</h2>
		<p class="text-sm text-neutral-500 dark:text-neutral-400">
			Symptom Tracker v1.0.0
		</p>
		<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
			A privacy-focused PWA for tracking health symptoms.
		</p>
	</Card>
</div>

<!-- Import Result Modal -->
<Modal bind:open={showImportModal} title={importSuccess ? 'Import Successful' : 'Import Failed'}>
	{#if importSuccess}
		<p class="text-neutral-600 dark:text-neutral-300">
			Your data has been imported successfully. The page will reload to apply changes.
		</p>
	{:else}
		<p class="text-warning">{importError}</p>
	{/if}

	{#snippet footer()}
		<Button
			class="w-full"
			onclick={() => {
				showImportModal = false;
				if (importSuccess) {
					window.location.reload();
				}
			}}
		>
			{importSuccess ? 'Reload' : 'Close'}
		</Button>
	{/snippet}
</Modal>
