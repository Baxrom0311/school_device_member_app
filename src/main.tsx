import './lib/sentry'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './components/error-boundary'
import './index.css'
import { setRouter } from './lib/router'
import { routeTree } from './routeTree.gen'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			retry: 1,
		},
	},
})

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
})

// Register router for non-React navigation (api-client, auth-store)
setRouter(router)

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw-push.js').catch(() => {})
}

const rootElement = document.getElementById('root')
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement)
	root.render(
		<StrictMode>
			<ErrorBoundary>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
					<Toaster richColors position='top-right' />
				</QueryClientProvider>
			</ErrorBoundary>
		</StrictMode>
	)
}
