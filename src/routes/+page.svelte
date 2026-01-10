<script lang="ts">
	import { goto } from '$app/navigation';
	import { sessions } from '$stores';
	import { SessionCard } from '$components/session';
	import { Button, EmptyState } from '$components/common';
	import { db } from '$db';
	import { onMount } from 'svelte';

	let entryCounts = $state<Record<string, number>>({});

	onMount(async () => {
		// Load entry counts for each session
		const counts: Record<string, number> = {};
		for (const session of $sessions) {
			const entries = await db.entries.where('sessionId').equals(session.id).count();
			counts[session.id] = entries;
		}
		entryCounts = counts;
	});

	// Re-calculate when sessions change
	$effect(() => {
		const sessionIds = $sessions.map((s) => s.id);
		Promise.all(
			sessionIds.map(async (id) => {
				const count = await db.entries.where('sessionId').equals(id).count();
				return { id, count };
			})
		).then((results) => {
			const counts: Record<string, number> = {};
			for (const { id, count } of results) {
				counts[id] = count;
			}
			entryCounts = counts;
		});
	});

	function handleSessionClick(sessionId: string) {
		goto(`/session/${sessionId}`);
	}

	function handleNewSession() {
		goto('/session/new');
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Sessions</h1>
	</div>

	{#if $sessions.length === 0}
		<!-- Empty state -->
		<EmptyState
			icon="📋"
			title="No sessions yet"
			description="Create your first tracking session to start logging your symptoms"
			actionLabel="+ New Session"
			onAction={handleNewSession}
		/>
	{:else}
		<!-- Sessions list -->
		<div class="space-y-3">
			{#each $sessions as session (session.id)}
				<SessionCard
					{session}
					entryCount={entryCounts[session.id] ?? 0}
					onclick={() => handleSessionClick(session.id)}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Floating action button -->
{#if $sessions.length > 0}
	<button
		onclick={handleNewSession}
		class="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
		aria-label="New session"
	>
		<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
		</svg>
	</button>
{/if}
