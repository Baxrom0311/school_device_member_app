import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { uz } from 'date-fns/locale'
import { AlertTriangle, Battery, CheckCircle2, Clock, Loader2, Lock, Radio, RefreshCw, WifiOff } from 'lucide-react'
import { useCallback } from 'react'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { deviceApi, type AlertType, type DeviceAlert } from '@/lib/device-api'
import { useEmergencyWs } from '@/hooks/use-emergency-ws'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/alerts')({
  component: AlertsPage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} />
  ),
})

const alertConfig: Record<AlertType, { label: string; icon: typeof AlertTriangle; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  panic: { label: 'Panic', icon: AlertTriangle, variant: 'destructive' },
  lockdown: { label: 'Lockdown', icon: Lock, variant: 'destructive' },
  emergency_ring: { label: 'Favqulodda signal', icon: Radio, variant: 'default' },
  offline: { label: 'Offline', icon: WifiOff, variant: 'secondary' },
  rtc_drift: { label: 'RTC vaqt farqi', icon: Clock, variant: 'secondary' },
  rtc_battery: { label: 'RTC batareya zaiflashgan', icon: Battery, variant: 'destructive' },
}

function getAlertDescription(alert: DeviceAlert): string | null {
  const name = alert.device_name || alert.device_id
  if (alert.alert_type === 'rtc_battery') {
    const days = alert.metadata?.consecutive_days
    const daysText = days ? ` (${days} kun ketma-ket)` : ''
    return name ? `${name} ning RTC batareykasini almashtiring${daysText}` : `RTC batareykasini almashtiring${daysText}`
  }
  if (alert.alert_type === 'rtc_drift' && alert.metadata?.drift_sec) {
    return `Vaqt farqi: ${alert.metadata.drift_sec}s${alert.metadata.battery_status === 'low' ? ' (batareya zaiflashgan)' : ''}`
  }
  return null
}

function AlertsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canResolve = user?.role === 'ADMIN' || user?.role === 'SCHOOL_ADMIN'

  const onAlert = useCallback((_alert: DeviceAlert) => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] })
  }, [queryClient])

  const { connected } = useEmergencyWs({ onAlert, onResolved: onAlert })

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => deviceApi.resolveEmergency(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Signal hal qilindi')
    },
    onError: () => toast.error('Xatolik yuz berdi'),
  })

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['alerts'],
    queryFn: ({ pageParam }) => deviceApi.getAlerts(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    refetchInterval: connected ? false : 30000, // Poll only if WS disconnected
  })

  const allAlerts = data?.pages.flatMap((p) => p.results) ?? []
  const totalCount = data?.pages[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Ogohlantirishlar
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Qurilma xavfsizlik signallari
            {connected && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                ● Live
              </Badge>
            )}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Tarix
            {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">
                Ma'lumotlarni yuklashda xatolik yuz berdi
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Qayta urinish
              </Button>
            </div>
          ) : !allAlerts.length ? (
            <p className="py-8 text-center text-muted-foreground">
              Ogohlantirishlar topilmadi
            </p>
          ) : (
            <div className="space-y-2">
              {allAlerts.map((alert) => {
                const config = alertConfig[alert.alert_type]
                const Icon = config.icon
                const description = getAlertDescription(alert)
                return (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        {description && (
                          <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: uz })}
                          {alert.device_name && ` · ${alert.device_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alert.resolved ? (
                        <Badge variant="outline" className="gap-1 text-green-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Hal qilindi
                        </Badge>
                      ) : (
                        <>
                          <Badge variant={config.variant}>Faol</Badge>
                          {canResolve && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => resolveMutation.mutate(alert.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Hal qilish
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {hasNextPage && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yuklanmoqda...</>
                  ) : (
                    "Ko'proq ko'rsatish"
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
