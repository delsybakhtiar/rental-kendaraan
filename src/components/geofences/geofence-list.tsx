'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  MapPin, 
  Shield, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Geofence } from '@/types';
import { useUpdateGeofence } from '@/hooks/use-dashboard';

interface GeofenceListProps {
  geofences: Geofence[];
  visibleGeofences: Set<string>;
  onToggleVisibility: (id: string) => void;
}

const typeColors: Record<string, string> = {
  safe: 'bg-green-500',
  restricted: 'bg-red-500',
  alert: 'bg-amber-500',
};

const typeLabels: Record<string, string> = {
  safe: 'Aman',
  restricted: 'Terlarang',
  alert: 'Alert',
};

export default function GeofenceList({
  geofences,
  visibleGeofences,
  onToggleVisibility,
}: GeofenceListProps) {
  const updateGeofence = useUpdateGeofence();

  const handleToggleActive = (geofence: Geofence) => {
    updateGeofence.mutate({
      id: geofence.id,
      data: { isActive: !geofence.isActive },
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Geofences
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 px-4 pb-4">
            {geofences.map((geofence) => (
              <div
                key={geofence.id}
                className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: geofence.color }}
                      />
                      <span className="font-semibold text-sm">{geofence.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {geofence.description}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${typeColors[geofence.type]} text-white text-[10px] px-1.5 py-0`}
                  >
                    {typeLabels[geofence.type]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onToggleVisibility(geofence.id)}
                    >
                      {visibleGeofences.has(geofence.id) ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    {geofence._count && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="h-3 w-3" />
                        {geofence._count.alerts} alerts
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Aktif</span>
                    <Switch
                      checked={geofence.isActive}
                      onCheckedChange={() => handleToggleActive(geofence)}
                      disabled={updateGeofence.isPending}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
