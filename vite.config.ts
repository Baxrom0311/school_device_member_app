import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({ autoCodeSplitting: true }),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	server: {
		port: 5174, // Different port from main dashboard
	},
	build: {
		sourcemap: 'hidden',
		rollupOptions: {
			output: {
				manualChunks: {
					'vendor-router': ['@tanstack/react-router', '@tanstack/react-query'],
					'vendor-ui': [
						'@radix-ui/react-dialog',
						'@radix-ui/react-dropdown-menu',
						'@radix-ui/react-select',
						'@radix-ui/react-switch',
						'@radix-ui/react-tooltip',
					],
					'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
				},
			},
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
	},
})
