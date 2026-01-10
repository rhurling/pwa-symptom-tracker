/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				// Primary - Sage Green (calming, health-associated)
				primary: {
					50: '#f0f5f1',
					100: '#d4e5d7',
					200: '#b8d4bd',
					300: '#9cc4a3',
					400: '#80b389',
					500: '#6b8f71',
					600: '#567259',
					700: '#415541'
				},
				// Neutral - Warm Gray
				neutral: {
					50: '#fafaf9',
					100: '#f5f5f4',
					200: '#e7e5e4',
					300: '#d6d3d1',
					400: '#a8a29e',
					500: '#78716c',
					600: '#57534e',
					700: '#44403c',
					800: '#292524',
					900: '#1c1917'
				},
				// Status Colors (muted, non-alarming)
				warning: {
					DEFAULT: '#d4a574',
					bg: '#fef7ed'
				},
				caution: {
					DEFAULT: '#c9a227',
					bg: '#fefce8'
				},
				info: {
					DEFAULT: '#7ba3c9',
					bg: '#eff6ff'
				},
				success: {
					DEFAULT: '#7dab8a',
					bg: '#f0fdf4'
				}
			},
			fontFamily: {
				sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
			},
			spacing: {
				'safe-bottom': 'env(safe-area-inset-bottom)'
			}
		}
	},
	plugins: []
};
