import { writable, derived } from 'svelte/store';
import type { MetricDefinition } from '$types';
import { db } from '$db';
import { browser } from '$app/environment';
import { generateId } from '$utils';

function createMetricsStore() {
	const { subscribe, set, update } = writable<MetricDefinition[]>([]);

	async function load() {
		if (!browser) return;
		try {
			const metrics = await db.metrics.toArray();
			set(metrics);
		} catch (error) {
			console.error('Failed to load metrics:', error);
		}
	}

	async function create(
		data: Omit<MetricDefinition, 'id' | 'isBuiltIn' | 'createdAt'>
	): Promise<MetricDefinition> {
		const metric: MetricDefinition = {
			id: generateId(),
			...data,
			isBuiltIn: false,
			createdAt: new Date()
		};

		try {
			await db.metrics.add(metric);
			update((metrics) => [...metrics, metric]);
			return metric;
		} catch (error) {
			console.error('Failed to create metric:', error);
			throw error;
		}
	}

	async function remove(id: string): Promise<void> {
		try {
			const metric = await db.metrics.get(id);
			if (metric?.isBuiltIn) {
				throw new Error('Cannot delete built-in metrics');
			}
			await db.metrics.delete(id);
			update((metrics) => metrics.filter((m) => m.id !== id));
		} catch (error) {
			console.error('Failed to delete metric:', error);
			throw error;
		}
	}

	async function getById(id: string): Promise<MetricDefinition | undefined> {
		if (!browser) return undefined;
		return db.metrics.get(id);
	}

	return {
		subscribe,
		load,
		create,
		remove,
		getById
	};
}

export const metrics = createMetricsStore();

export const builtInMetrics = derived(metrics, ($metrics) =>
	$metrics.filter((m) => m.isBuiltIn)
);

export const customMetrics = derived(metrics, ($metrics) =>
	$metrics.filter((m) => !m.isBuiltIn)
);

export const metricsById = derived(metrics, ($metrics) => {
	const map = new Map<string, MetricDefinition>();
	for (const metric of $metrics) {
		map.set(metric.id, metric);
	}
	return map;
});
