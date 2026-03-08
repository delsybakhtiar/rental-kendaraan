'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import type { GeofenceAlert, TrackingLog } from '@/types';
import { useResolveAlert } from '@/hooks/use-dashboard';

interface AlertsPanelProps {
  alerts: GeofenceAlert[];
  trackingLogs?: TrackingLog[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const resolveAlert = useResolveAlert();

  const handleResolve = (alertId: string) => {
    resolveAlert.mutate(alertId);
  };

  const unresolvedAlerts = alerts.filter((a) => !a.isResolved);
  const resolvedAlerts = alerts.filter((a) => a.isResolved);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Alerts
          {unresolvedAlerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unresolvedAlerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full mx-4 mt-0 w-[calc(100%-32px)]">
            <TabsTrigger value="active" className="text-xs">
              Aktif ({unresolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Selesai ({resolvedAlerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-0">
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 px-4 pb-4 pt-2">
                {unresolvedAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Semua alert telah ditangani!</p>
                  </div>
                ) : (
                  unresolvedAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={alert.alertType === 'entry' ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              {alert.alertType === 'entry' ? 'Masuk' : 'Keluar'}
                            </Badge>
                            <span className="font-medium text-sm">
                              {alert.vehicle?.plateNumber}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {alert.geofence?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.createdAt).toLocaleString('id-ID')}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolveAlert.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Selesai
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="resolved" className="mt-0">
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 px-4 pb-4 pt-2">
                {resolvedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">
                        {alert.vehicle?.plateNumber}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {alert.alertType === 'entry' ? 'Masuk' : 'Keluar'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Diselesaikan: {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function TrackingTimeline({ logs }: { logs: TrackingLog[] }) {
  if (!logs || logs.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Riwayat Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Pilih kendaraan untuk melihat riwayat</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group logs by hour
  const groupedLogs = logs.reduce((acc, log) => {
    const hour = new Date(log.recordedAt).getHours();
    const key = `${new Date(log.recordedAt).toLocaleDateString('id-ID')} ${hour}:00`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {} as Record<string, TrackingLog[]>);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Riwayat Tracking ({logs.length} titik)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-4 px-4 pb-4">
            {Object.entries(groupedLogs).map(([time, timeLogs]) => (
              <div key={time}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  {time}
                </h4>
                <div className="space-y-2">
                  {timeLogs.slice(0, 3).map((log, idx) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full ${log.ignition ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {idx < timeLogs.length - 1 && (
                          <div className="w-0.5 h-6 bg-muted-foreground/20" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                          </span>
                        </div>
                        {log.speed && (
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            <span>{log.speed.toFixed(1)} km/jam</span>
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(log.recordedAt).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                  ))}
                  {timeLogs.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{timeLogs.length - 3} titik lainnya
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
