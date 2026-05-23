import * as Sentry from '@sentry/react'

const dsn = import.meta.env.VITE_SENTRY_DSN

if (dsn) {
	Sentry.init({
		dsn,
		environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
		integrations: [Sentry.browserTracingIntegration()],
		tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
		enabled: import.meta.env.PROD,
	})
}

export { Sentry }
