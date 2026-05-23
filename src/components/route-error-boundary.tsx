import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteErrorProps {
	error: Error
	reset?: () => void
}

export function RouteErrorBoundary({ error, reset }: RouteErrorProps) {
	return (
		<div className='flex h-[50vh] flex-col items-center justify-center gap-4 p-8'>
			<AlertTriangle className='h-12 w-12 text-destructive' />
			<h2 className='text-lg font-semibold'>Xatolik yuz berdi</h2>
			<p className='max-w-md text-center text-sm text-muted-foreground'>
				{error.message || "Kutilmagan xatolik. Iltimos, qayta urinib ko'ring."}
			</p>
			<Button variant='outline' onClick={() => reset?.()}>
				<RefreshCw className='mr-2 h-4 w-4' />
				Qayta urinish
			</Button>
		</div>
	)
}
