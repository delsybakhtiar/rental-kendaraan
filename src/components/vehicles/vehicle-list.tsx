'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Car, 
  MapPin, 
  Clock,
  DollarSign,
  MoreVertical,
  AlertTriangle,
  ShieldCheck,
  PowerOff,
  Loader2
} from 'lucide-react';
import type { Vehicle } from '@/types';
import { formatRelativeTime } from '@/lib/utils-serializer';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onVehicleUpdate?: () => void;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500',
  rented: 'bg-blue-500',
  maintenance: 'bg-amber-500',
  emergency: 'bg-red-600 animate-pulse',
};

const statusLabels: Record<string, string> = {
  available: 'Tersedia',
  rented: 'Disewa',
  maintenance: 'Perawatan',
  emergency: '🚨 DARURAT',
};

// Bintan Island boundary
const BINTAN_BOUNDS = {
  minLat: 0.75,
  maxLat: 1.35,
  minLng: 104.1,
  maxLng: 104.95,
};

// Check if a point is inside Bintan Island
function isInsideBintan(lat: number, lng: number): boolean {
  return lat >= BINTAN_BOUNDS.minLat && 
         lat <= BINTAN_BOUNDS.maxLat && 
         lng >= BINTAN_BOUNDS.minLng && 
         lng <= BINTAN_BOUNDS.maxLng;
}

// Helper to safely extract number from dailyRate (handles Decimal objects)
function getDailyRateValue(dailyRate: Vehicle['dailyRate']): number {
  if (dailyRate === null || dailyRate === undefined) return 0;
  if (typeof dailyRate === 'number') return dailyRate;
  if (typeof dailyRate === 'object' && dailyRate !== null && 'toNumber' in dailyRate) {
    return (dailyRate as { toNumber: () => number }).toNumber();
  }
  return 0;
}

// Format currency as Indonesian Rupiah
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function VehicleList({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onVehicleUpdate,
}: VehicleListProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    vehicle: Vehicle | null;
    isLoading: boolean;
  }>({ open: false, vehicle: null, isLoading: false });

  const handleEngineKill = async () => {
    if (!confirmDialog.vehicle) return;
    
    setConfirmDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${confirmDialog.vehicle.id}/engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          reason: 'Emergency: Vehicle outside Bintan Island boundary',
          setStatus: 'emergency',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConfirmDialog({ open: false, vehicle: null, isLoading: false });
        onVehicleUpdate?.();
      } else {
        throw new Error(data.message || 'Gagal mengaktifkan engine kill');
      }
    } catch (error) {
      console.error('Engine kill error:', error);
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-5 w-5" />
            Daftar Kendaraan
            <Badge variant="secondary" className="ml-auto">
              {vehicles.length} unit
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 px-4 pb-4">
              {vehicles.map((vehicle) => {
                const dailyRate = getDailyRateValue(vehicle.dailyRate);
                const hasLocation = vehicle.latitude && vehicle.longitude;
                const isOutsideBintan = hasLocation && !isInsideBintan(vehicle.latitude!, vehicle.longitude!);
                const isEmergency = vehicle.status === 'emergency' || vehicle.engineEnabled === false;
                
                return (
                  <div
                    key={vehicle.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedVehicle?.id === vehicle.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : isEmergency
                        ? 'border-red-400 bg-red-50 hover:border-red-500'
                        : isOutsideBintan
                        ? 'border-red-300 bg-red-50 hover:border-red-400'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => onSelectVehicle(vehicle)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">
                            {vehicle.plateNumber}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`${statusColors[vehicle.status] || 'bg-gray-500'} text-white text-[10px] px-1.5 py-0`}
                          >
                            {statusLabels[vehicle.status] || vehicle.status}
                          </Badge>
                          {isOutsideBintan && !isEmergency && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0 animate-pulse"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              OUT OF BINTAN
                            </Badge>
                          )}
                          {isEmergency && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0 animate-pulse"
                            >
                              <PowerOff className="h-3 w-3 mr-1" />
                              ENGINE KILLED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {vehicle.brand} {vehicle.model} ({vehicle.year})
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {hasLocation ? (
                          <div className={`flex items-center gap-1 ${isOutsideBintan || isEmergency ? 'text-red-500 font-medium' : ''}`}>
                            {isOutsideBintan || isEmergency ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <ShieldCheck className="h-3 w-3 text-green-500" />
                            )}
                            <span>{isEmergency ? 'MESIN DIMATIKAN!' : isOutsideBintan ? 'Di luar zona!' : 'Lokasi aman'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <MapPin className="h-3 w-3" />
                            <span>No location</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatRupiah(dailyRate)}/hari</span>
                      </div>
                    </div>

                    {vehicle.lastLocationAt && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Update: {formatRelativeTime(vehicle.lastLocationAt)}
                      </div>
                    )}

                    {/* Emergency Engine Kill Button - Only for vehicles OUT OF BINTAN */}
                    {isOutsideBintan && !isEmergency && (
                      <div className="mt-3 pt-2 border-t border-red-200">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({ open: true, vehicle, isLoading: false });
                          }}
                        >
                          <PowerOff className="h-4 w-4 mr-2" />
                          Matikan Mesin Remote
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => 
        setConfirmDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Engine Kill
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-800 mb-2">
                  ⚠️ Anda akan mematikan mesin kendaraan secara REMOTE:
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p><strong>Plat Nomor:</strong> {confirmDialog.vehicle?.plateNumber}</p>
                  <p><strong>Kendaraan:</strong> {confirmDialog.vehicle?.brand} {confirmDialog.vehicle?.model}</p>
                  <p><strong>Status:</strong> OUT OF BINTAN</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Perhatian:</strong> Tindakan ini akan:
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside mt-1">
                  <li>Mengubah status kendaraan menjadi <strong>EMERGENCY/DARURAT</strong></li>
                  <li>Menonaktifkan mesin kendaraan</li>
                  <li>Marker kendaraan di peta akan berhenti bergerak</li>
                  <li>Alert darurat akan dikirim ke sistem</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmDialog.isLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEngineKill}
              disabled={confirmDialog.isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {confirmDialog.isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Ya, Matikan Mesin
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
