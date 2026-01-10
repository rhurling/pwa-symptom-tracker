<script lang="ts">
	import { sessions, entries, settings, metricsById } from '$stores';
	import { Button, Card, Modal } from '$components/common';
	import { formatDate, formatTime, formatDateFull, getDateRangeLabel } from '$utils/dates';
	import { formatTemperature, getTemperatureStatus, getTemperatureStatusLabel } from '$utils/temperature';
	import { db } from '$db';
	import type { TrackingSession, Entry } from '$types';

	let selectedSessionId = $state<string>('');
	let startDate = $state('');
	let endDate = $state('');
	let includeNotes = $state(true);
	let includeAnnotations = $state(true);
	let llmPromptStyle = $state<'general' | 'patterns' | 'treatment' | 'none'>('general');
	let exportFormat = $state<'chronological' | 'sectioned'>('chronological');

	let showPreviewModal = $state(false);
	let markdownOutput = $state('');
	let isGenerating = $state(false);
	let copySuccess = $state(false);

	const selectedSession = $derived($sessions.find((s) => s.id === selectedSessionId));

	// Auto-set date range when session is selected
	$effect(() => {
		if (selectedSession) {
			const start = selectedSession.createdAt;
			const end = selectedSession.resolvedAt ?? new Date();
			startDate = start.toISOString().split('T')[0];
			endDate = end.toISOString().split('T')[0];
		}
	});

	const llmPromptOptions = [
		{ value: 'none', label: 'No prompt' },
		{ value: 'general', label: 'General analysis' },
		{ value: 'patterns', label: 'Pattern identification' },
		{ value: 'treatment', label: 'Treatment correlation' }
	] as const;

	async function generateMarkdown() {
		if (!selectedSession) return;

		isGenerating = true;

		try {
			// Load entries for this session
			const sessionEntries = await db.getEntriesForSession(selectedSessionId, {
				startDate: startDate ? new Date(startDate) : undefined,
				endDate: endDate ? new Date(endDate + 'T23:59:59') : undefined
			});

			markdownOutput = generateMarkdownExport(selectedSession, sessionEntries);
			showPreviewModal = true;
		} catch (error) {
			console.error('Failed to generate export:', error);
		} finally {
			isGenerating = false;
		}
	}

	function generateMarkdownExport(session: TrackingSession, sessionEntries: Entry[]): string {
		const lines: string[] = [];

		// LLM Prompt Header
		if (llmPromptStyle !== 'none') {
			lines.push(getLlmPromptHeader(llmPromptStyle));
			lines.push('---\n');
		}

		// Title and metadata
		lines.push(`# Symptom Log: ${session.name}\n`);
		lines.push(`**Period:** ${getDateRangeLabel(new Date(startDate), new Date(endDate))}`);
		lines.push(`**Status:** ${session.status.charAt(0).toUpperCase() + session.status.slice(1)}`);
		lines.push(`**Total Entries:** ${sessionEntries.length}`);
		lines.push('');
		lines.push('---\n');

		if (exportFormat === 'chronological') {
			lines.push('## Chronological Entries\n');

			// Group by day
			const byDay = new Map<string, Entry[]>();
			for (const entry of sessionEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())) {
				const dayKey = formatDateFull(entry.timestamp);
				if (!byDay.has(dayKey)) {
					byDay.set(dayKey, []);
				}
				byDay.get(dayKey)!.push(entry);
			}

			for (const [day, dayEntries] of byDay) {
				lines.push(`### ${day}\n`);

				for (const entry of dayEntries) {
					const time = formatTime(entry.timestamp);
					const icon = getMetricIcon(entry.metricId);
					const value = getEntryValue(entry);
					const warning = includeAnnotations ? getWarning(entry) : '';

					lines.push(`**${time}**`);
					lines.push(`- ${icon} ${value}${warning}`);

					if (includeNotes && entry.note) {
						lines.push(`- Note: "${entry.note}"`);
					}
					if (includeNotes && entry.value.type === 'feeling' && entry.value.note) {
						lines.push(`- Note: "${entry.value.note}"`);
					}
					lines.push('');
				}
			}
		} else {
			// Sectioned format
			lines.push('## Summary\n');

			// Temperature stats
			const tempEntries = sessionEntries.filter((e) => e.value.type === 'temperature');
			if (tempEntries.length > 0) {
				const temps = tempEntries.map((e) => (e.value as { celsius: number }).celsius);
				const minTemp = Math.min(...temps);
				const maxTemp = Math.max(...temps);
				lines.push(`- **Temperature Range:** ${formatTemperature(minTemp, $settings.temperatureUnit)} - ${formatTemperature(maxTemp, $settings.temperatureUnit)}`);
			}

			// Feeling stats
			const feelingEntries = sessionEntries.filter((e) => e.value.type === 'feeling');
			if (feelingEntries.length > 0) {
				const values = feelingEntries.map((e) => (e.value as { emojiValue: number }).emojiValue);
				const avgFeeling = values.reduce((a, b) => a + b, 0) / values.length;
				lines.push(`- **Average Feeling:** ${avgFeeling.toFixed(1)}/5`);
			}

			lines.push('');
			lines.push('---\n');

			// Temperature log
			if (tempEntries.length > 0) {
				lines.push('## Temperature Log\n');
				lines.push('| Date | Time | Value | Status |');
				lines.push('|------|------|-------|--------|');

				for (const entry of tempEntries) {
					const date = formatDate(entry.timestamp);
					const time = formatTime(entry.timestamp);
					const value = formatTemperature((entry.value as { celsius: number }).celsius, $settings.temperatureUnit);
					const status = getTemperatureStatusLabel(getTemperatureStatus((entry.value as { celsius: number }).celsius));
					lines.push(`| ${date} | ${time} | ${value} | ${status} |`);
				}
				lines.push('');
			}

			// Events log
			const eventEntries = sessionEntries.filter((e) => e.value.type === 'event');
			if (eventEntries.length > 0) {
				lines.push('## Events\n');
				lines.push('| Date | Time | Event |');
				lines.push('|------|------|-------|');

				for (const entry of eventEntries) {
					const date = formatDate(entry.timestamp);
					const time = formatTime(entry.timestamp);
					const desc = (entry.value as { description: string }).description;
					lines.push(`| ${date} | ${time} | ${desc} |`);
				}
				lines.push('');
			}
		}

		return lines.join('\n');
	}

	function getLlmPromptHeader(style: 'general' | 'patterns' | 'treatment'): string {
		switch (style) {
			case 'general':
				return `# Instructions for Analysis

Please analyze the following symptom log and provide:
1. A summary of the illness progression
2. Notable patterns or observations
3. Any concerning trends that might warrant medical attention
4. General observations about recovery timeline
`;
			case 'patterns':
				return `# Instructions for Pattern Analysis

Please analyze the following symptom log with focus on identifying:
1. Correlations between different symptoms
2. Time-of-day patterns in symptoms
3. Response patterns to medications/interventions
4. Cyclical patterns if present
5. Triggers or aggravating factors suggested by the data
`;
			case 'treatment':
				return `# Instructions for Treatment Analysis

Please analyze the following symptom log with focus on:
1. Effectiveness of logged medications/interventions
2. Time-to-effect for treatments
3. Duration of treatment benefits
4. Suggestions for optimal treatment timing based on patterns
5. Any treatments that appear less effective

Note: This analysis is for informational purposes only and should not replace professional medical advice.
`;
		}
	}

	function getMetricIcon(metricId: string): string {
		switch (metricId) {
			case 'temperature': return '🌡️ Temperature:';
			case 'feeling': return '😐 Feeling:';
			case 'event': return '📝 Event:';
			default: return '📊';
		}
	}

	function getEntryValue(entry: Entry): string {
		switch (entry.value.type) {
			case 'temperature':
				return formatTemperature(entry.value.celsius, $settings.temperatureUnit);
			case 'feeling':
				return `${entry.value.emoji} ${['', 'Terrible', 'Poor', 'Okay', 'Good', 'Great'][entry.value.emojiValue]}`;
			case 'event':
				return entry.value.description;
			default:
				return '';
		}
	}

	function getWarning(entry: Entry): string {
		if (entry.value.type !== 'temperature') return '';
		const status = getTemperatureStatus(entry.value.celsius);
		if (status === 'fever') return ' ⚠️ (fever)';
		if (status === 'high_fever') return ' 🔴 (high fever)';
		if (status === 'hypothermia') return ' ❄️ (low temp)';
		return '';
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(markdownOutput);
			copySuccess = true;
			setTimeout(() => copySuccess = false, 2000);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	}

	function downloadFile() {
		const blob = new Blob([markdownOutput], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `symptom-log-${selectedSession?.name.replace(/\s+/g, '-').toLowerCase() ?? 'export'}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Export Data</h1>

	{#if $sessions.length === 0}
		<Card class="text-center">
			<p class="text-neutral-500">No sessions to export yet.</p>
		</Card>
	{:else}
		<!-- Session selector -->
		<div class="space-y-1">
			<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Session
			</label>
			<select
				bind:value={selectedSessionId}
				class="input"
			>
				<option value="">Select a session...</option>
				{#each $sessions as session (session.id)}
					<option value={session.id}>{session.name}</option>
				{/each}
			</select>
		</div>

		{#if selectedSessionId}
			<!-- Date range -->
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Start Date
					</label>
					<input type="date" bind:value={startDate} class="input" />
				</div>
				<div class="space-y-1">
					<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						End Date
					</label>
					<input type="date" bind:value={endDate} class="input" />
				</div>
			</div>

			<!-- Format options -->
			<Card>
				<h2 class="mb-3 font-medium text-neutral-800 dark:text-neutral-100">Format Options</h2>

				<div class="space-y-3">
					<div class="space-y-2">
						<label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Structure</label>
						<div class="flex gap-2">
							<button
								onclick={() => exportFormat = 'chronological'}
								class="flex-1 rounded-lg border p-2 text-sm {exportFormat === 'chronological'
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-neutral-200 dark:border-neutral-700'}"
							>
								Chronological
							</button>
							<button
								onclick={() => exportFormat = 'sectioned'}
								class="flex-1 rounded-lg border p-2 text-sm {exportFormat === 'sectioned'
									? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
									: 'border-neutral-200 dark:border-neutral-700'}"
							>
								Sectioned
							</button>
						</div>
					</div>

					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={includeNotes} class="h-4 w-4 rounded border-neutral-300" />
						<span class="text-sm text-neutral-700 dark:text-neutral-300">Include notes</span>
					</label>

					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={includeAnnotations} class="h-4 w-4 rounded border-neutral-300" />
						<span class="text-sm text-neutral-700 dark:text-neutral-300">Include threshold annotations</span>
					</label>
				</div>
			</Card>

			<!-- LLM Prompt -->
			<Card>
				<h2 class="mb-3 font-medium text-neutral-800 dark:text-neutral-100">LLM Analysis Prompt</h2>
				<div class="space-y-2">
					{#each llmPromptOptions as option}
						<button
							onclick={() => llmPromptStyle = option.value}
							class="flex w-full items-center gap-3 rounded-lg border p-2 text-left text-sm {llmPromptStyle === option.value
								? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
								: 'border-neutral-200 dark:border-neutral-700'}"
						>
							<div class="flex h-4 w-4 items-center justify-center rounded-full border {llmPromptStyle === option.value
								? 'border-primary-500 bg-primary-500'
								: 'border-neutral-300 dark:border-neutral-600'}">
								{#if llmPromptStyle === option.value}
									<div class="h-2 w-2 rounded-full bg-white"></div>
								{/if}
							</div>
							{option.label}
						</button>
					{/each}
				</div>
			</Card>

			<!-- Generate button -->
			<Button onclick={generateMarkdown} class="w-full" loading={isGenerating}>
				Generate Export
			</Button>
		{/if}
	{/if}
</div>

<!-- Preview Modal -->
<Modal bind:open={showPreviewModal} title="Export Preview">
	<div class="max-h-96 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
		<pre class="whitespace-pre-wrap text-xs text-neutral-700 dark:text-neutral-300">{markdownOutput}</pre>
	</div>

	{#snippet footer()}
		<div class="flex gap-3">
			<Button variant="secondary" class="flex-1" onclick={copyToClipboard}>
				{copySuccess ? '✓ Copied!' : 'Copy'}
			</Button>
			<Button class="flex-1" onclick={downloadFile}>
				Download .md
			</Button>
		</div>
	{/snippet}
</Modal>
