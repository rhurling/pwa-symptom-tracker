import { writable, derived } from 'svelte/store';
import type { UserSettings } from '$types';
import { db, DEFAULT_USER_SETTINGS } from '$db';
import { browser } from '$app/environment';

function createSettingsStore() {
	const { subscribe, set, update } = writable<UserSettings>(DEFAULT_USER_SETTINGS);

	async function load() {
		if (!browser) return;
		try {
			const settings = await db.getSettings();
			if (settings) {
				set(settings);
			} else {
				await db.saveSettings(DEFAULT_USER_SETTINGS);
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
		}
	}

	async function save(settings: UserSettings) {
		if (!browser) return;
		const updated = { ...settings, updatedAt: new Date() };
		try {
			await db.saveSettings(updated);
			set(updated);
		} catch (error) {
			console.error('Failed to save settings:', error);
			throw error;
		}
	}

	async function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
		update((current) => {
			const updated = { ...current, [key]: value, updatedAt: new Date() };
			if (browser) {
				db.saveSettings(updated).catch(console.error);
			}
			return updated;
		});
	}

	return {
		subscribe,
		load,
		save,
		updateSetting,
		setTemperatureUnit: (unit: 'celsius' | 'fahrenheit') => updateSetting('temperatureUnit', unit),
		setTheme: (theme: 'light' | 'dark' | 'system') => updateSetting('theme', theme)
	};
}

export const settings = createSettingsStore();

export const temperatureUnit = derived(settings, ($settings) => $settings.temperatureUnit);
export const theme = derived(settings, ($settings) => $settings.theme);
