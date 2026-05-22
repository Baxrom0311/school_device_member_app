import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	children: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null }

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('ErrorBoundary caught:', error, info.componentStack)
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className='flex h-svh w-full flex-col items-center justify-center gap-4 p-4'>
					<h1 className='text-2xl font-bold'>Xatolik yuz berdi</h1>
					<p className='text-muted-foreground text-center'>
						Kutilmagan xatolik. Sahifani qayta yuklang.
					</p>
					<button
						className='rounded-md bg-primary px-4 py-2 text-primary-foreground'
						onClick={() => window.location.reload()}
					>
						Sahifani yangilash
					</button>
				</div>
			)
		}
		return this.props.children
	}
}
