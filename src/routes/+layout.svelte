<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { settings, sessions, metrics } from '$stores';
	import { browser } from '$app/environment';
	import { OfflineIndicator, PageTransition } from '$components/common';

	let { children } = $props();
	let mediaQuery: MediaQueryList | null = null;

	// Initialize stores and theme
	onMount(async () => {
		await Promise.all([settings.load(), sessions.load(), metrics.load()]);
		applyTheme($settings.theme);

		// Listen for system theme preference changes
		if (browser) {
			mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addEventListener('change', handleSystemThemeChange);
		}
	});

	onDestroy(() => {
		// Clean up the media query listener
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleSystemThemeChange);
		}
	});

	function handleSystemThemeChange() {
		// Only react if user has 'system' theme selected
		if ($settings.theme === 'system') {
			applyTheme('system');
		}
	}

	function applyTheme(theme: 'light' | 'dark' | 'system') {
		if (!browser) return;

		const root = document.documentElement;
		if (theme === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('dark', theme === 'dark');
		}
	}

	// React to theme changes
	$effect(() => {
		applyTheme($settings.theme);
	});

	// Navigation items
	const navItems = [
		{ href: '/', label: 'Sessions', icon: 'sessions' },
		{ href: '/export', label: 'Export', icon: 'export' },
		{ href: '/settings', label: 'Settings', icon: 'settings' }
	];

	function isActive(href: string): boolean {
		if (href === '/') {
			return $page.url.pathname === '/' || $page.url.pathname.startsWith('/session');
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<title>Symptom Tracker</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- Skip link for keyboard users -->
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
	>
		Skip to main content
	</a>

	<!-- Header -->
	<header class="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-[#3d423d] dark:bg-[#1a1d1a]/80" role="banner">
		<div class="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
			<a href="/" class="text-lg font-semibold text-primary-600 dark:text-primary-400">
				Symptom Tracker
			</a>
			<a
				href="/settings"
				class="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
				aria-label="Settings"
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</a>
		</div>
	</header>

	<!-- Main Content -->
	<main id="main-content" class="mx-auto w-full max-w-lg flex-1 px-4 pb-20 pt-4" role="main">
		<PageTransition>
			{#snippet children()}
				{@render children()}
			{/snippet}
		</PageTransition>
	</main>

	<!-- Offline Indicator -->
	<OfflineIndicator variant="toast" />

	<!-- Bottom Navigation -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm dark:border-[#3d423d] dark:bg-[#1a1d1a]/95"
		style="padding-bottom: env(safe-area-inset-bottom);"
		aria-label="Main navigation"
		role="navigation"
	>
		<div class="mx-auto flex max-w-lg items-center justify-around">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors {isActive(item.href)
						? 'text-primary-600 dark:text-primary-400'
						: 'text-neutral-500 dark:text-neutral-400'}"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					{#if item.icon === 'sessions'}
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
						</svg>
					{:else if item.icon === 'export'}
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
					{:else if item.icon === 'settings'}
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					{/if}
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
