import { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'

interface RouterContext {
	queryClient: QueryClient
}

function NotFoundComponent() {
	return (
		<div className='flex min-h-screen flex-col items-center justify-center gap-4 p-4'>
			<h1 className='text-4xl font-bold'>404</h1>
			<p className='text-muted-foreground'>Sahifa topilmadi</p>
			<Link to='/' className='text-primary underline'>
				Bosh sahifaga qaytish
			</Link>
		</div>
	)
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
	const message = error instanceof Error ? error.message : "Noma'lum xatolik"
	return (
		<div className='flex min-h-screen flex-col items-center justify-center gap-4 p-4'>
			<h1 className='text-2xl font-bold text-destructive'>Xatolik yuz berdi</h1>
			<p className='text-muted-foreground'>{message}</p>
			<button
				type='button'
				onClick={reset}
				className='text-primary underline'
			>
				Qayta urinish
			</button>
		</div>
	)
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: () => <Outlet />,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent,
})
