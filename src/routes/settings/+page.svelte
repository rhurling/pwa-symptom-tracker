<script lang="ts">
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

	async function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		importError = '';
		importSuccess = false;

		try {
			const text = await file.text();
			const data = JSON.parse(text) as ExportData;

			// Validate structure
			if (!data.exportVersion || !data.data) {
				throw new Error('Invalid export file format');
			}

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
