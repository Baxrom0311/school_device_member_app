import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { uz } from 'date-fns/locale'
import { AlertTriangle, Bell, Clock, Loader2, RefreshCw, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { RouteErrorBoundary } from '@/components/route-error-boundary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute } from '@tanstack/react-router'
import { deviceApi, type BellTriggerSource } from '@/lib/device-api'

export const Route = createFileRoute('/_authenticated/bell-logs')({
  component: BellLogsPage,
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} />
  ),
})

const triggerLabels: Record<BellTriggerSource, string> = {
  schedule: 'Jadval',
  manual: "Qo'lda",
  emergency: 'Favqulodda',
  mqtt: 'MQTT',
}

const triggerVariants: Record<BellTriggerSource, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  schedule: 'secondary',
  manual: 'outline',
  emergency: 'destructive',
  mqtt: 'default',
}

function BellLogsPage() {
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  const { data: devicesData, isLoading: devicesLoading, error: devicesError } = useQuery({
    queryKey: ['my-devices'],
    queryFn: deviceApi.getMyDevices,
    staleTime: 60000,
  })

  const device = devicesData?.results?.[0]

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['bell-logs', device?.id, dateFrom, dateTo],
    queryFn: ({ pageParam }) => deviceApi.getBellLogs(device!.id, pageParam, dateFrom, dateTo),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.next ? lastPageParam + 1 : undefined,
    enabled: !!device,
  })

  const allLogs = data?.pages.flatMap((p) => p.results) ?? []
  const totalCount = data?.pages[0]?.count ?? 0

  if (!device && !devicesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" />
            Qo'ng'iroq tarixi
          </h1>
        </div>
        <Card>
          <CardContent className="py-8">
            {devicesError ? (
              <div className="text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-destructive">Qurilmalarni yuklashda xatolik</p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                Avval qurilmani qo'shing
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Qo'ng'iroq tarixi
        </h1>
        <p className="text-muted-foreground">Oxirgi qo'ng'iroqlar ro'yxati</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label htmlFor="date-from" className="text-xs">Dan</Label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date-to" className="text-xs">Gacha</Label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tarix
            {totalCount > 0 && <Badge variant="secondary">{totalCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive">
                Tarixni yuklashda xatolik yuz berdi
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Qayta urinish
              </Button>
            </div>
          ) : !allLogs.length ? (
            <p className="py-8 text-center text-muted-foreground">
              Qo'ng'iroq tarixi topilmadi
            </p>
          ) : (
            <div className="space-y-2">
              {allLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(log.rang_at), 'HH:mm:ss', { locale: uz })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.rang_at), 'd MMMM yyyy', { locale: uz })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(log.duration_ms / 1000).toFixed(1)}s
                    </span>
                    <Badge variant={triggerVariants[log.trigger_source]}>
                      {triggerLabels[log.trigger_source]}
                    </Badge>
                  </div>
                </div>
              ))}
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
