import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

const basePath = process.env.BASE_PATH || '';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: 'src',
			mode: 'production',
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			scope: `${basePath}/`,
			base: `${basePath}/`,
			manifest: {
				name: 'Symptom Tracker',
				short_name: 'Symptoms',
				description: 'Track health symptoms privately on your device',
				start_url: `${basePath}/`,
				scope: `${basePath}/`,
				display: 'standalone',
				background_color: '#f5f7f5',
				theme_color: '#6b8f71',
				orientation: 'portrait-primary',
				icons: [
					{
						src: `${basePath}/icons/icon.svg`,
						sizes: 'any',
						type: 'image/svg+xml',
						purpose: 'any'
					},
					{
						src: `${basePath}/icons/icon-192.png`,
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: `${basePath}/icons/icon-512.png`,
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				],
				categories: ['health', 'medical', 'lifestyle']
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'images',
							expiration: {
								maxEntries: 50
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	]
});
