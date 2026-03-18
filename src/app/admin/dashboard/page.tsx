'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  RefreshCw, 
  Navigation,
  Activity,
  Clock,
  AlertTriangle,
  Power,
  PowerOff,
  ShieldAlert,
  Map,
  ShieldCheck,
  Crown,
  LogOut,
  User,
  Sparkles,
  Bell,
  Plus,
  Upload,
  X,
  Car,
  Trash2,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  CreditCard,
  Wrench,
  Calendar,
  History,
  FileSpreadsheet,
  Download,
  Radio,
  LocateFixed,
  Shield
} from 'lucide-react';
import type { Vehicle, Geofence, TrackingLog, TrackingStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useDashboard, useVehicles, useGeofences, useTrackingLogs, useAlerts, useTrackingStatus } from '@/hooks/use-dashboard';
import { createWhatsAppUrl, STANDARD_TO_PREMIUM_MESSAGE } from '@/lib/contact';
import { TrackingTimeline } from '@/components/tracking/tracking-history';
import { VuraSignature } from '@/components/vura-signature';
import {
  formatRentalDate,
  getLatestRental,
  getRentalOperationalBadgeClass,
  getRentalOperationalLabel,
  getRentalOperationalStatus,
} from '@/lib/rental-summary';
import { isInsideOperationalArea } from '@/lib/operational-area';

type AccountType = 'standard' | 'premium';

// Activity Log Type
interface ActivityLog {
  id: string;
  type: 'rental_complete' | 'payment' | 'status_update' | 'booking' | 'vehicle_add';
  message: string;
  vehiclePlate?: string;
  amount?: number;
  timestamp: Date;
  icon: 'check' | 'credit' | 'wrench' | 'calendar' | 'car';
}

interface VehicleImageProps {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallbackClassName: string;
  fallbackIconClassName: string;
  testId?: string;
}

function VehicleImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackIconClassName,
  testId,
}: VehicleImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className={fallbackClassName} data-testid={testId ? `${testId}-fallback` : undefined}>
        <ImageIcon className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      data-testid={testId}
      onError={() => setFailedSrc(src)}
    />
  );
}

// Helper functions
function getDailyRateValue(dailyRate: unknown): number {
  if (dailyRate === null || dailyRate === undefined) return 0;
  if (typeof dailyRate === 'number') return dailyRate;
  if (typeof dailyRate === 'object' && dailyRate !== null && 'toNumber' in dailyRate) {
    return (dailyRate as { toNumber: () => number }).toNumber();
  }
  return 0;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGpsStatusBadgeClass(gpsStatus: string | null | undefined): string {
  if (gpsStatus === 'online') {
    return 'bg-green-500/20 text-green-400 border border-green-500/30';
  }

  if (gpsStatus === 'stale') {
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  }

  return 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30';
}

function getGpsStatusLabel(gpsStatus: string | null | undefined): string {
  if (gpsStatus === 'online') {
    return 'GPS Online';
  }

  if (gpsStatus === 'stale') {
    return 'GPS Stale';
  }

  return 'GPS Offline';
}

function getGpsStatusHelperText(gpsStatus: string | null | undefined): string | undefined {
  if (gpsStatus === 'stale') {
    return 'GPS stale berarti lokasi terakhir kendaraan sudah lama tidak diperbarui.';
  }

  return undefined;
}

function getGpsModeBadgeClass(mode: 'demo' | 'production' | undefined): string {
  return mode === 'demo'
    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
}

function getGpsModeLabel(mode: 'demo' | 'production' | undefined): string {
  return mode === 'demo' ? 'GPS Demo Mode' : 'GPS Production Mode';
}

function getVehicleRentalSummary(vehicle: Vehicle) {
  const rental = getLatestRental(vehicle.rentals);
  const status = getRentalOperationalStatus(rental);

  return {
    rental,
    status,
    label: getRentalOperationalLabel(status),
    badgeClass: getRentalOperationalBadgeClass(status),
    startDateLabel: formatRentalDate(rental?.startDate),
    endDateLabel: formatRentalDate(rental?.endDate),
  };
}

// Dynamically import the map component
const TrackingMap = dynamic(() => import('@/components/map/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-white/5 rounded-lg">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-400" />
        <p className="text-sm text-white/40">Memuat peta...</p>
      </div>
    </div>
  ),
});

const BINTAN_CENTER: [number, number] = [1.05, 104.45];

function getExternalTrackingStatusClass(status: TrackingStatus['externalService']['status'] | undefined) {
  switch (status) {
    case 'healthy':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'degraded':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'offline':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    default:
      return 'bg-white/10 text-white/60 border border-white/10';
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [visibleGeofences, setVisibleGeofences] = useState<Set<string>>(new Set());
  const [engineActionLoading, setEngineActionLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('standard');
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();
  
  // Add Vehicle Dialog State
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    dailyRate: '',
    status: 'available',
    imageUrl: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Complete Rental Dialog State
  const [isCompleteRentalOpen, setIsCompleteRentalOpen] = useState(false);
  const [vehicleToComplete, setVehicleToComplete] = useState<Vehicle | null>(null);
  const [isCompletingRental, setIsCompletingRental] = useState(false);
  const [deviceIdForm, setDeviceIdForm] = useState('');
  const [isSavingDeviceId, setIsSavingDeviceId] = useState(false);

  // Export Excel State
  const [isExporting, setIsExporting] = useState(false);

  // Activity Log State - with initial mock data
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    {
      id: '1',
      type: 'rental_complete',
      message: 'Sewa Selesai: Toyota Avanza (BP 1234 AA) telah kembali.',
      vehiclePlate: 'BP 1234 AA',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'check',
    },
    {
      id: '2',
      type: 'payment',
      message: 'Pembayaran Dikonfirmasi: Booking #1029 sebesar Rp 500.000.',
      amount: 500000,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      icon: 'credit',
    },
    {
      id: '3',
      type: 'status_update',
      message: 'Status Update: Suzuki Ertiga masuk jadwal Servis Rutin.',
      vehiclePlate: 'BP 5678 CD',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: 'wrench',
    },
    {
      id: '4',
      type: 'booking',
      message: 'Booking Baru: Honda Jazz (BP 9012 EF) untuk 3 hari.',
      vehiclePlate: 'BP 9012 EF',
      timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
      icon: 'calendar',
    },
    {
      id: '5',
      type: 'vehicle_add',
      message: 'Kendaraan Baru: Mitsubishi Xpander (BP 3456 GH) ditambahkan.',
      vehiclePlate: 'BP 3456 GH',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      icon: 'car',
    },
  ]);

  // Helper function to format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    return date.toLocaleDateString('id-ID');
  };

  // Helper function to add new activity log
  const addActivityLog = (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    const newLog: ActivityLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const renderActivityLogItem = useCallback((log: ActivityLog) => {
    const getIcon = () => {
      switch (log.icon) {
        case 'check':
          return <CheckCircle className="h-4 w-4 text-green-400" />;
        case 'credit':
          return <CreditCard className="h-4 w-4 text-blue-400" />;
        case 'wrench':
          return <Wrench className="h-4 w-4 text-amber-400" />;
        case 'calendar':
          return <Calendar className="h-4 w-4 text-purple-400" />;
        case 'car':
          return <Car className="h-4 w-4 text-cyan-400" />;
        default:
          return <Activity className="h-4 w-4 text-white/50" />;
      }
    };

    const getBgColor = () => {
      switch (log.type) {
        case 'rental_complete':
          return 'bg-green-500/15 border-green-400/30';
        case 'payment':
          return 'bg-blue-500/15 border-blue-400/30';
        case 'status_update':
          return 'bg-amber-500/15 border-amber-400/30';
        case 'booking':
          return 'bg-purple-500/15 border-purple-400/30';
        case 'vehicle_add':
          return 'bg-cyan-500/15 border-cyan-400/30';
        default:
          return 'bg-white/10 border-white/15';
      }
    };

    return (
      <div
        key={log.id}
        className={`p-3 rounded-lg border ${getBgColor()} transition-all hover:scale-[1.01]`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1.5 rounded-md bg-white/5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 leading-snug">
              {log.message}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="h-3 w-3 text-white/30" />
              <span className="text-xs text-white/40">
                {formatRelativeTime(log.timestamp)}
              </span>
              {log.amount && (
                <span className="text-xs font-medium text-green-400 ml-auto">
                  {formatRupiah(log.amount)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  // Check authentication
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (!token || !storedUser) {
          router.push('/admin/login');
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setAccountType(parsedUser.accountType || 'standard');
        setUserInfo({
          name: parsedUser.name || 'Admin',
          email: parsedUser.email || 'admin@rental.com',
        });
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/admin/login');
      } finally {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const isPremium = accountType === 'premium';
  const upgradeToPremiumUrl = createWhatsAppUrl(STANDARD_TO_PREMIUM_MESSAGE);

  // Fetch data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useDashboard();
  const { data: vehicles = [], refetch: refetchVehicles } = useVehicles();
  const { data: geofences = [] } = useGeofences(true);
  const { data: alerts = [], refetch: refetchAlerts } = useAlerts(false);
  const { data: trackingData } = useTrackingLogs(selectedVehicle?.id, 24);
  const { data: trackingStatus } = useTrackingStatus();
  const gpsIntegrationMode = dashboardData?.gpsIntegrationMode ?? 'production';

  const vehiclesWithLocation = useMemo(() => 
    dashboardData?.vehiclesWithLocation || vehicles.filter(v => v.latitude && v.longitude),
    [dashboardData, vehicles]
  );

  const criticalAlerts = useMemo(() => 
    isPremium ? alerts.filter(a => a.alertLevel === 'critical' && !a.isResolved) : [],
    [alerts, isPremium]
  );
  const highAlerts = useMemo(() => 
    isPremium ? alerts.filter(a => a.alertLevel === 'high' && !a.isResolved) : [],
    [alerts, isPremium]
  );

  const isVehicleOutsideBintan = useMemo(() => {
    if (!selectedVehicle?.latitude || !selectedVehicle?.longitude) return false;
    return !isInsideOperationalArea(selectedVehicle.latitude, selectedVehicle.longitude);
  }, [selectedVehicle]);

  const displayedGeofences = useMemo(() => {
    if (visibleGeofences.size === 0 && geofences.length > 0) {
      return geofences;
    }
    return geofences.filter((g) => visibleGeofences.has(g.id));
  }, [geofences, visibleGeofences]);

  const toggleGeofenceVisibility = (id: string) => {
    setVisibleGeofences((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDeviceIdForm(vehicle.deviceId || '');
  };

  // Engine Kill/Restore handlers
  const handleEngineKill = useCallback(async () => {
    if (!selectedVehicle || !isPremium) return;
    
    const reason = prompt('Masukkan alasan Engine Kill:');
    if (!reason) return;

    setEngineActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${selectedVehicle.id}/engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Engine Kill Diaktifkan',
          description: `Mesin kendaraan ${selectedVehicle.plateNumber} telah dinonaktifkan.`,
          variant: 'destructive',
        });
        refetchDashboard();
        refetchVehicles();
        refetchAlerts();
      } else {
        throw new Error(data.message || 'Gagal mengaktifkan engine kill');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengaktifkan engine kill',
        variant: 'destructive',
      });
    } finally {
      setEngineActionLoading(false);
    }
  }, [selectedVehicle, toast, refetchDashboard, refetchVehicles, refetchAlerts, isPremium]);

  const handleEngineRestore = useCallback(async () => {
    if (!selectedVehicle || !isPremium) return;

    if (!confirm(`Apakah Anda yakin ingin mengaktifkan kembali mesin ${selectedVehicle.plateNumber}?`)) {
      return;
    }

    setEngineActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${selectedVehicle.id}/engine`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Mesin Diaktifkan',
          description: `Mesin kendaraan ${selectedVehicle.plateNumber} telah diaktifkan kembali.`,
        });
        refetchDashboard();
        refetchVehicles();
      } else {
        throw new Error(data.message || 'Gagal mengaktifkan mesin');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengaktifkan mesin',
        variant: 'destructive',
      });
    } finally {
      setEngineActionLoading(false);
    }
  }, [selectedVehicle, toast, refetchDashboard, refetchVehicles, isPremium]);

  const handleSaveDeviceProvisioning = useCallback(async () => {
    if (!selectedVehicle || !isPremium) return;

    setIsSavingDeviceId(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          deviceId: deviceIdForm.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Gagal menyimpan device GPS');
      }

      const updatedVehicle = data as Vehicle;
      setSelectedVehicle(updatedVehicle);
      setDeviceIdForm(updatedVehicle.deviceId || '');
      refetchVehicles();
      refetchDashboard();

      toast({
        title: 'Provisioning Berhasil',
        description: updatedVehicle.deviceId
          ? `Device ${updatedVehicle.deviceId} terhubung ke ${updatedVehicle.plateNumber}.`
          : `Device GPS dilepas dari ${updatedVehicle.plateNumber}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyimpan device GPS',
        variant: 'destructive',
      });
    } finally {
      setIsSavingDeviceId(false);
    }
  }, [deviceIdForm, isPremium, refetchDashboard, refetchVehicles, selectedVehicle, toast]);

  const trackingLogs: TrackingLog[] = trackingData?.logs || [];
  const fleetSecurityStats = trackingStatus ?? {
    vehicles: {
      total: vehicles.length,
      withLocation: vehicles.filter((vehicle) => vehicle.latitude && vehicle.longitude).length,
      outsideOperationalArea: vehicles.filter((vehicle) =>
        vehicle.latitude && vehicle.longitude && !isInsideOperationalArea(vehicle.latitude, vehicle.longitude)
      ).length,
      engineKilled: vehicles.filter((vehicle) => vehicle.engineEnabled === false).length,
    },
    gps: {
      online: vehicles.filter((vehicle) => vehicle.gpsStatus === 'online').length,
      stale: vehicles.filter((vehicle) => vehicle.gpsStatus === 'stale').length,
      offline: vehicles.filter((vehicle) => vehicle.gpsStatus !== 'online' && vehicle.gpsStatus !== 'stale').length,
    },
    tracking: {
      recentPointsLastHour: 0,
    },
    sync: {
      pending: 0,
      exhausted: 0,
      oldestPendingMinutes: 0,
    },
    externalService: {
      configuredUrl: 'not-configured',
      status: 'unknown' as const,
      reachable: false,
      httpStatus: null,
      details: null,
    },
  };
  const securityVehicles = useMemo(() => (
    vehiclesWithLocation
      .filter((vehicle) =>
        vehicle.latitude !== null &&
        vehicle.longitude !== null &&
        (!isInsideOperationalArea(vehicle.latitude, vehicle.longitude) || vehicle.gpsStatus === 'stale'),
      )
      .sort((a, b) => {
        const aOutside = a.latitude !== null && a.longitude !== null && !isInsideOperationalArea(a.latitude, a.longitude);
        const bOutside = b.latitude !== null && b.longitude !== null && !isInsideOperationalArea(b.latitude, b.longitude);
        return Number(bOutside) - Number(aOutside);
      })
  ), [vehiclesWithLocation]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/admin/login');
  };

  const resetImageSelection = useCallback(() => {
    setImagePreview(null);
    setVehicleForm((prev) => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Tipe file tidak valid. Gunakan JPEG, PNG, WebP, atau GIF.',
        variant: 'destructive',
      });
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file terlalu besar. Maksimum 5MB.',
        variant: 'destructive',
      });
      input.value = '';
      return;
    }

    setVehicleForm((prev) => ({ ...prev, imageUrl: '' }));

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVehicleForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
        toast({
          title: 'Upload Berhasil',
          description: 'Gambar kendaraan berhasil diupload.',
        });
      } else {
        const errorMessage = data.details
          ? `${data.error || 'Gagal mengupload gambar'} (${data.details})`
          : (data.error || 'Gagal mengupload gambar');
        throw new Error(errorMessage);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengupload gambar',
        variant: 'destructive',
      });
      resetImageSelection();
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  // Add Vehicle Handler
  const handleAddVehicle = async () => {
    if (isUploading) {
      toast({
        title: 'Upload Belum Selesai',
        description: 'Tunggu hingga upload gambar selesai sebelum menambahkan kendaraan.',
        variant: 'destructive',
      });
      return;
    }

    if (!vehicleForm.plateNumber || !vehicleForm.brand || !vehicleForm.model || !vehicleForm.dailyRate) {
      toast({
        title: 'Error',
        description: 'Mohon lengkapi semua field yang wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plateNumber: vehicleForm.plateNumber,
          brand: vehicleForm.brand,
          model: vehicleForm.model,
          year: vehicleForm.year,
          color: vehicleForm.color,
          dailyRate: parseFloat(vehicleForm.dailyRate),
          status: vehicleForm.status,
          imageUrl: vehicleForm.imageUrl || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Kendaraan Ditambahkan',
          description: `${vehicleForm.plateNumber} berhasil ditambahkan ke armada.`,
        });
        setIsAddVehicleOpen(false);
        setVehicleForm({
          plateNumber: '',
          brand: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          dailyRate: '',
          status: 'available',
          imageUrl: '',
        });
        resetImageSelection();
        refetchDashboard();
        refetchVehicles();
        
        // Add activity log for new vehicle
        addActivityLog({
          type: 'vehicle_add',
          message: `Kendaraan Baru: ${vehicleForm.brand} ${vehicleForm.model} (${vehicleForm.plateNumber}) ditambahkan.`,
          vehiclePlate: vehicleForm.plateNumber,
          icon: 'car',
        });
      } else {
        throw new Error(data.error || 'Gagal menambahkan kendaraan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menambahkan kendaraan',
        variant: 'destructive',
      });
    }
  };

  // Delete Vehicle Handler
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kendaraan ini?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Kendaraan Dihapus',
          description: 'Kendaraan berhasil dihapus dari armada.',
        });
        setSelectedVehicle(null);
        refetchDashboard();
        refetchVehicles();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus kendaraan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menghapus kendaraan',
        variant: 'destructive',
      });
    }
  };

  // Complete Rental Handler
  const handleOpenCompleteRental = (vehicle: Vehicle) => {
    setVehicleToComplete(vehicle);
    setIsCompleteRentalOpen(true);
  };

  const handleCompleteRental = async () => {
    if (!vehicleToComplete) return;

    setIsCompletingRental(true);
    try {
      const rentalResponse = await fetch(`/api/rentals/vehicle/${vehicleToComplete.id}/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      let rentalId = null;

      if (rentalResponse.ok) {
        const rentalData = await rentalResponse.json();
        rentalId = rentalData.data?.id;
      }

      const response = await fetch(`/api/vehicles/${vehicleToComplete.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ status: 'available' }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengupdate status kendaraan');
      }

      if (rentalId) {
        await fetch(`/api/rentals/${rentalId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify({ status: 'completed' }),
        });
      }

      toast({
        title: 'Sewa Selesai',
        description: `Mobil ${vehicleToComplete.plateNumber} telah dikembalikan dan tersedia kembali.`,
      });

      addActivityLog({
        type: 'rental_complete',
        message: `Sewa Selesai: ${vehicleToComplete.brand} ${vehicleToComplete.model} (${vehicleToComplete.plateNumber}) telah kembali.`,
        vehiclePlate: vehicleToComplete.plateNumber,
        icon: 'check',
      });

      setIsCompleteRentalOpen(false);
      setVehicleToComplete(null);
      setSelectedVehicle(null);
      refetchDashboard();
      refetchVehicles();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal menyelesaikan sewa',
        variant: 'destructive',
      });
    } finally {
      setIsCompletingRental(false);
    }
  };

  // Export to Excel Handler
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export/excel', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      
      if (!response.ok) {
        let message = 'Gagal mengekspor data';
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          message = errorData.error || errorData.message || errorData.details || message;
        }
        throw new Error(message);
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `Laporan_BintanDrive_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Berhasil',
        description: `File ${filename} telah diunduh.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Gagal mengekspor data ke Excel',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isAuthLoading || dashboardLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-lg font-medium text-white">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-amber-600/10 to-orange-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-full blur-[80px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-lg opacity-50"></div>
                  <div className="relative p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                    <Map className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Bintan Island</h1>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin Dashboard</p>
                </div>
              </Link>
              
              {isPremium ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Crown className="h-3 w-3 mr-1" />
                  Premium
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-white/5 text-white/60">
                  Standard
                </Badge>
              )}

              <Badge
                variant="secondary"
                className={getGpsModeBadgeClass(gpsIntegrationMode)}
                data-testid="gps-mode-indicator"
              >
                {getGpsModeLabel(gpsIntegrationMode)}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {userInfo && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-white/50">
                  <User className="h-4 w-4" />
                  <span>{userInfo.name}</span>
                </div>
              )}
              {isPremium && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Activity className="h-4 w-4 animate-pulse" />
                  <span>Live</span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchDashboard();
                  if (isPremium) refetchAlerts();
                }}
                className="border-white/20 text-gray-800 bg-white/90 hover:text-white hover:bg-white/10 font-medium cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-6">
        {/* Standard Account Upgrade Banner */}
        {!isPremium && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Crown className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-300">Akun Standard</p>
                    <p className="text-sm text-amber-200/60">Upgrade ke Premium untuk fitur GPS Tracking & Engine Kill</p>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  <a
                    href={upgradeToPremiumUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="upgrade-premium-banner-cta"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade Premium
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Critical Alerts Banner (Premium Only) */}
        {isPremium && criticalAlerts.length > 0 && (
          <div className="mb-6">
            <Alert className="bg-red-500/10 border-red-500/30 text-red-300">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle className="font-bold text-red-300">PERINGATAN KRITIS</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  {criticalAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
                      <strong>{alert.message.split('\n')[0]}</strong>
                      {alert.vehicle && (
                        <span className="ml-2 text-red-400">({alert.vehicle.plateNumber})</span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300/70">Total Kendaraan</p>
                  <p className="text-2xl font-bold text-blue-300">{dashboardData?.vehicleStats?.total || 0}</p>
                </div>
                <Navigation className="h-8 w-8 text-blue-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300/70">Tersedia</p>
                  <p className="text-2xl font-bold text-green-300">{dashboardData?.vehicleStats?.available || 0}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-green-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300/70">Disewa</p>
                  <p className="text-2xl font-bold text-purple-300">{dashboardData?.vehicleStats?.rented || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-400/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-300/70">Alerts</p>
                  <p className="text-2xl font-bold text-amber-300">{isPremium ? (dashboardData?.unresolvedAlerts || 0) : '-'}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-400/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left - Vehicle List */}
          <div className="lg:col-span-3">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <Navigation className="h-5 w-5 text-blue-400" />
                    Daftar Kendaraan
                  </CardTitle>
                  <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Car className="h-5 w-5 text-amber-400" />
                          Tambah Kendaraan Baru
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                          Masukkan detail kendaraan baru ke dalam armada.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        {/* Image Upload */}
                        <div className="space-y-2">
                          <Label className="text-white/70">Foto Kendaraan</Label>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="vehicle-image-upload-trigger"
                            className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                          >
                            {imagePreview ? (
                              <div className="relative" data-testid="vehicle-image-preview-container">
                                <img 
                                  src={imagePreview} 
                                  alt="Preview" 
                                  className="max-h-40 mx-auto rounded-lg object-contain"
                                  data-testid="vehicle-image-preview"
                                />
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="absolute top-2 right-2 h-6 w-6 p-0"
                                  data-testid="vehicle-image-remove"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    resetImageSelection();
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="py-4">
                                {isUploading ? (
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-400" />
                                ) : (
                                  <>
                                    <Upload className="h-8 w-8 mx-auto text-white/30 mb-2" />
                                    <p className="text-sm text-white/40">Klik untuk upload gambar</p>
                                    <p className="text-xs text-white/30">JPEG, PNG, WebP (max 5MB)</p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            data-testid="vehicle-image-input"
                          />
                        </div>

                        {/* Plate Number */}
                        <div className="space-y-2">
                          <Label className="text-white/70">Nomor Polisi *</Label>
                          <Input
                            value={vehicleForm.plateNumber}
                            onChange={(e) => setVehicleForm(prev => ({ ...prev, plateNumber: e.target.value }))}
                            placeholder="B 1234 ABC"
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            data-testid="vehicle-plate-number"
                          />
                        </div>

                        {/* Brand & Model */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-white/70">Merek *</Label>
                            <Input
                              value={vehicleForm.brand}
                              onChange={(e) => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                              placeholder="Toyota"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              data-testid="vehicle-brand"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Model *</Label>
                            <Input
                              value={vehicleForm.model}
                              onChange={(e) => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="Avanza"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              data-testid="vehicle-model"
                            />
                          </div>
                        </div>

                        {/* Year & Color */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-white/70">Tahun</Label>
                            <Input
                              type="number"
                              value={vehicleForm.year}
                              onChange={(e) => setVehicleForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                              className="bg-white/5 border-white/10 text-white"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Warna</Label>
                            <Input
                              value={vehicleForm.color}
                              onChange={(e) => setVehicleForm(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="Silver"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                        </div>

                        {/* Daily Rate & Status */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-white/70">Tarif/Hari (Rp) *</Label>
                            <Input
                              type="number"
                              value={vehicleForm.dailyRate}
                              onChange={(e) => setVehicleForm(prev => ({ ...prev, dailyRate: e.target.value }))}
                              placeholder="350000"
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              data-testid="vehicle-daily-rate"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Status</Label>
                            <Select
                              value={vehicleForm.status}
                              onValueChange={(value) => setVehicleForm(prev => ({ ...prev, status: value }))}
                            >
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0a0a0f] border-white/10">
                                <SelectItem value="available" className="text-white hover:bg-white/10">Tersedia</SelectItem>
                                <SelectItem value="rented" className="text-white hover:bg-white/10">Disewa</SelectItem>
                                <SelectItem value="maintenance" className="text-white hover:bg-white/10">Maintenance</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddVehicleOpen(false)}
                          className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleAddVehicle}
                          disabled={isUploading}
                          data-testid="vehicle-submit"
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Tambah Kendaraan
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    (() => {
                      const rentalSummary = getVehicleRentalSummary(vehicle);

                      return (
                        <div
                          key={vehicle.id}
                          onClick={() => handleVehicleSelect(vehicle)}
                          data-testid={`vehicle-list-item-${vehicle.id}`}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedVehicle?.id === vehicle.id
                              ? 'bg-blue-500/20 border border-blue-500/30'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <VehicleImage
                                src={vehicle.imageUrl}
                                alt={vehicle.plateNumber}
                                className="w-10 h-10 rounded-lg object-contain bg-white/5"
                                fallbackClassName="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"
                                fallbackIconClassName="h-5 w-5 text-white/30"
                                testId={`vehicle-list-image-${vehicle.id}`}
                              />
                              <div>
                                <p className="font-medium text-white text-sm">{vehicle.plateNumber}</p>
                                <p className="text-xs text-white/40">{vehicle.brand} {vehicle.model}</p>
                                {rentalSummary.rental && (
                                  <div className="mt-1 space-y-1" data-testid={`vehicle-rental-summary-${vehicle.id}`}>
                                    <p className="text-[11px] text-white/45">
                                      {rentalSummary.startDateLabel} - {rentalSummary.endDateLabel}
                                    </p>
                                    <Badge variant="secondary" className={rentalSummary.badgeClass}>
                                      Sewa {rentalSummary.label}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {vehicle.status === 'rented' && (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCompleteRental(vehicle);
                                  }}
                                  className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Selesaikan
                                </Button>
                              )}
                              <Badge 
                                variant="secondary" 
                                className={
                                  vehicle.status === 'available' 
                                    ? 'bg-green-500/20 text-green-400'
                                    : vehicle.status === 'rented'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }
                              >
                                {vehicle.status === 'available' ? 'Tersedia' : vehicle.status === 'rented' ? 'Disewa' : 'Service'}
                              </Badge>
                              {isPremium && (
                                <Badge
                                  variant="secondary"
                                  className={getGpsStatusBadgeClass(vehicle.gpsStatus)}
                                  title={getGpsStatusHelperText(vehicle.gpsStatus)}
                                >
                                  {getGpsStatusLabel(vehicle.gpsStatus)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Center - Map (Premium) or Activity Log (Standard) */}
          <div className="lg:col-span-6">
            {isPremium ? (
              <Card className="h-[500px] bg-white/[0.02] border-white/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2 text-white">
                      <MapPin className="h-5 w-5 text-blue-400" />
                      Peta Pulau Bintan
                      {selectedVehicle && (
                        <Badge variant="secondary" className="ml-2 bg-white/10 text-white/60">
                          {selectedVehicle.plateNumber}
                        </Badge>
                      )}
                    </CardTitle>
                    <Button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      data-testid="premium-export-report"
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mengunduh...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4" />
                          Unduh Laporan
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-2 h-[calc(100%-60px)] flex flex-col gap-2">
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-green-300/80">GPS Online</p>
                      <p className="mt-1 text-xl font-semibold text-green-300" data-testid="fleet-gps-online">
                        {fleetSecurityStats.gps.online}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-amber-300/80">GPS Stale</p>
                      <p className="mt-1 text-xl font-semibold text-amber-300" data-testid="fleet-gps-stale">
                        {fleetSecurityStats.gps.stale}
                      </p>
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-red-300/80">Keluar Area</p>
                      <p className="mt-1 text-xl font-semibold text-red-300" data-testid="fleet-outside-area">
                        {fleetSecurityStats.vehicles.outsideOperationalArea}
                      </p>
                    </div>
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-cyan-300/80">Sync Pending</p>
                      <p className="mt-1 text-xl font-semibold text-cyan-300" data-testid="fleet-sync-pending">
                        {fleetSecurityStats.sync.pending}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TrackingMap
                      vehicles={vehiclesWithLocation}
                      geofences={displayedGeofences}
                      selectedVehicle={selectedVehicle}
                      trackingPath={trackingLogs}
                      center={BINTAN_CENTER}
                      zoom={11}
                      onVehicleClick={handleVehicleSelect}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[500px] bg-white/[0.02] border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-white">
                      <History className="h-5 w-5 text-cyan-400" />
                      Aktivitas Terakhir
                      <Badge variant="secondary" className="ml-2 bg-cyan-500/20 text-cyan-400">
                        {activityLogs.length} log
                      </Badge>
                    </CardTitle>
                    {/* TOMBOL EXPORT EXCEL - HIJAU */}
                    <Button
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Mengunduh...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-4 w-4" />
                          Unduh Laporan
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[420px] overflow-y-auto">
                    <div className="space-y-1 p-4 pt-0">
                      {activityLogs.map((log) => renderActivityLogItem(log))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right - Geofences/Alerts (Premium) or Upgrade (Standard) */}
          <div className="lg:col-span-3">
            {isPremium ? (
              <Card className="bg-white/[0.02] border-white/10">
                <CardContent className="p-4">
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3" data-testid="fleet-security-health">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-white/40">Fleet Security Health</p>
                        <p className="mt-1 text-sm text-white/80">
                          {fleetSecurityStats.tracking.recentPointsLastHour} titik tracking dalam 1 jam terakhir
                        </p>
                      </div>
                      <Badge className={getExternalTrackingStatusClass(fleetSecurityStats.externalService.status)}>
                        {fleetSecurityStats.externalService.status === 'healthy'
                          ? 'Tracking Service Healthy'
                          : fleetSecurityStats.externalService.status === 'degraded'
                          ? 'Tracking Service Degraded'
                          : fleetSecurityStats.externalService.status === 'offline'
                          ? 'Tracking Service Offline'
                          : 'Tracking Service Unknown'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/60">
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        Sync exhausted: <span className="font-medium text-white">{fleetSecurityStats.sync.exhausted}</span>
                      </div>
                      <div className="rounded-lg bg-white/5 px-3 py-2">
                        Engine kill: <span className="font-medium text-white">{fleetSecurityStats.vehicles.engineKilled}</span>
                      </div>
                    </div>
                  </div>
                  <Tabs defaultValue="geofences">
                    <TabsList className="grid w-full grid-cols-5 border border-white/10 bg-white/10 p-1">
                      <TabsTrigger value="geofences" className="text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#0a0a0f] data-[state=active]:shadow-sm">Zona</TabsTrigger>
                      <TabsTrigger value="alerts" className="text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#0a0a0f] data-[state=active]:shadow-sm relative">
                        Alerts
                        {(criticalAlerts.length + highAlerts.length) > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                            {criticalAlerts.length + highAlerts.length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="tracking" className="text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#0a0a0f] data-[state=active]:shadow-sm">
                        Tracking
                      </TabsTrigger>
                      <TabsTrigger value="security" className="text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#0a0a0f] data-[state=active]:shadow-sm">
                        Security
                      </TabsTrigger>
                      <TabsTrigger value="history" className="text-xs text-white/70 data-[state=active]:bg-white data-[state=active]:text-[#0a0a0f] data-[state=active]:shadow-sm">
                        Riwayat
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="geofences" className="mt-4">
                      <div className="space-y-2">
                        {geofences.map((g) => (
                          <div key={g.id} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white">{g.name}</span>
                              <Badge 
                                variant="secondary" 
                                style={{ backgroundColor: `${g.color}20`, color: g.color }}
                              >
                                {g.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="alerts" className="mt-4">
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {alerts.length === 0 ? (
                          <p className="text-sm text-white/40 text-center py-4">Tidak ada alert</p>
                        ) : (
                          alerts.map((alert) => (
                            <div key={alert.id} className="p-3 bg-white/5 rounded-lg border-l-2 border-amber-500">
                              <p className="text-sm text-white">{alert.message.split('\n')[0]}</p>
                              <p className="text-xs text-white/40 mt-1">
                                {new Date(alert.createdAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="tracking" className="mt-4">
                      <div data-testid="premium-tracking-panel">
                        <TrackingTimeline logs={trackingLogs} />
                      </div>
                    </TabsContent>

                    <TabsContent value="security" className="mt-4">
                      <div className="space-y-2 max-h-[300px] overflow-y-auto" data-testid="premium-security-workflow">
                        {securityVehicles.length === 0 ? (
                          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
                            Tidak ada kendaraan prioritas tinggi. Semua unit berada dalam area operasional dan GPS tidak stale.
                          </div>
                        ) : (
                          securityVehicles.map((vehicle) => {
                            const outsideArea =
                              vehicle.latitude !== null &&
                              vehicle.longitude !== null &&
                              !isInsideOperationalArea(vehicle.latitude, vehicle.longitude);

                            return (
                              <div
                                key={vehicle.id}
                                className={`rounded-lg border p-3 ${
                                  outsideArea
                                    ? 'border-red-500/30 bg-red-500/10'
                                    : 'border-amber-500/30 bg-amber-500/10'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-white">{vehicle.plateNumber}</p>
                                    <p className="text-xs text-white/50">{vehicle.brand} {vehicle.model}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {outsideArea && (
                                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
                                        Keluar Area
                                      </Badge>
                                    )}
                                    {vehicle.gpsStatus === 'stale' && (
                                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        GPS Stale
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <p className="text-xs text-white/60">
                                    Device: <span className="text-white/80">{vehicle.deviceId || 'belum dipasang'}</span>
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                    onClick={() => handleVehicleSelect(vehicle)}
                                  >
                                    <LocateFixed className="h-3.5 w-3.5 mr-2" />
                                    Fokus Kendaraan
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-4">
                      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 max-h-[300px] overflow-y-auto" data-testid="premium-history-panel">
                        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                          Riwayat membantu admin melihat aktivitas kendaraan terbaru. Warna panel dibuat lebih terang agar status dan waktu lebih mudah dibaca.
                        </div>
                        {activityLogs.length === 0 ? (
                          <p className="text-sm text-white/40 text-center py-4">Belum ada riwayat kendaraan</p>
                        ) : (
                          activityLogs.map((log) => renderActivityLogItem(log))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
                <CardContent className="p-6 text-center">
                  <Crown className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                  <h3 className="font-semibold text-amber-300 mb-2">Fitur Premium</h3>
                  <p className="text-sm text-amber-200/60 mb-4">
                    Unlock fitur tracking lengkap dengan upgrade ke akun Premium
                  </p>
                  <div className="space-y-2 text-sm text-left">
                    {[
                      { icon: Navigation, text: 'Real-time GPS Tracking' },
                      { icon: ShieldAlert, text: 'Geofencing Alerts' },
                      { icon: Bell, text: 'Port Watch Monitoring' },
                      { icon: Power, text: 'Remote Engine Kill' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-amber-200/80">
                        <item.icon className="h-4 w-4 text-amber-400" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    asChild
                    className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  >
                    <a
                      href={upgradeToPremiumUrl}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="upgrade-premium-panel-cta"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Premium
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Selected Vehicle Details */}
        {selectedVehicle && (
          <div className="mt-6">
            {(() => {
              const rentalSummary = getVehicleRentalSummary(selectedVehicle);

              return (
            <Card className={`bg-white/[0.02] border-white/10 ${isVehicleOutsideBintan && isPremium ? 'border-red-500/30 ring-1 ring-red-500/20' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2 text-white">
                    <VehicleImage
                      src={selectedVehicle.imageUrl}
                      alt={selectedVehicle.plateNumber}
                      className="w-12 h-12 rounded-lg object-contain bg-white/5"
                      fallbackClassName="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center"
                      fallbackIconClassName="h-6 w-6 text-amber-400"
                      testId="selected-vehicle-image"
                    />
                    <div>
                      <p className="font-semibold">{selectedVehicle.plateNumber}</p>
                      <p className="text-xs text-white/40">{selectedVehicle.brand} {selectedVehicle.model}</p>
                    </div>
                    {isVehicleOutsideBintan && isPremium && (
                      <Badge variant="destructive" className="animate-pulse">
                        OUT OF BINTAN
                      </Badge>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {isPremium && (
                      selectedVehicle.engineEnabled === false ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEngineRestore}
                          disabled={engineActionLoading}
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                        >
                          <Power className="h-4 w-4 mr-2" />
                          Aktifkan Mesin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEngineKill}
                          disabled={engineActionLoading}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <PowerOff className="h-4 w-4 mr-2" />
                          Engine Kill
                        </Button>
                      )
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVehicle(selectedVehicle.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVehicle(null)}
                      className="text-white/40"
                    >
                      Tutup
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-white/40">Kendaraan</p>
                    <p className="font-medium text-white">{selectedVehicle.brand} {selectedVehicle.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Tahun</p>
                    <p className="font-medium text-white">{selectedVehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Warna</p>
                    <p className="font-medium text-white">{selectedVehicle.color}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Status</p>
                    <Badge className={
                      selectedVehicle.status === 'available' ? 'bg-green-500/20 text-green-400' :
                      selectedVehicle.status === 'rented' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }>
                      {selectedVehicle.status === 'available' ? 'Tersedia' : selectedVehicle.status === 'rented' ? 'Disewa' : 'Service'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Tarif/Hari</p>
                    <p className="font-medium text-blue-400">{formatRupiah(getDailyRateValue(selectedVehicle.dailyRate))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Mulai Sewa</p>
                    <p className="font-medium text-white" data-testid="selected-vehicle-rental-start">
                      {rentalSummary.startDateLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Akhir Sewa</p>
                    <p className="font-medium text-white" data-testid="selected-vehicle-rental-end">
                      {rentalSummary.endDateLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Status Sewa</p>
                    <Badge className={rentalSummary.badgeClass} data-testid="selected-vehicle-rental-status">
                      {rentalSummary.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Status Mesin</p>
                    <Badge className={selectedVehicle.engineEnabled !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {selectedVehicle.engineEnabled !== false ? 'Aktif' : 'Dimatikan'}
                    </Badge>
                  </div>
                  {isPremium && (
                    <div>
                      <p className="text-xs text-white/40">Status GPS</p>
                      <Badge
                        className={getGpsStatusBadgeClass(selectedVehicle.gpsStatus)}
                        data-testid="selected-vehicle-gps-status"
                        title={getGpsStatusHelperText(selectedVehicle.gpsStatus)}
                      >
                        {getGpsStatusLabel(selectedVehicle.gpsStatus)}
                      </Badge>
                      {selectedVehicle.gpsStatus === 'stale' && (
                        <p className="mt-1 text-[11px] text-amber-200/80" data-testid="selected-vehicle-gps-helper">
                          GPS stale: lokasi terakhir kendaraan sudah lama tidak diperbarui.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {selectedVehicle.latitude && selectedVehicle.longitude && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs text-white/40">Lokasi Terakhir</p>
                    <p className="font-medium text-sm text-white">
                      {selectedVehicle.latitude.toFixed(6)}, {selectedVehicle.longitude.toFixed(6)}
                      {isVehicleOutsideBintan && isPremium && (
                        <span className="ml-2 text-red-400">Di luar Bintan Island</span>
                      )}
                    </p>
                  </div>
                )}

                {isPremium && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-cyan-400" />
                      <p className="text-sm font-medium text-white">Provisioning Device GPS</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        value={deviceIdForm}
                        onChange={(event) => setDeviceIdForm(event.target.value)}
                        placeholder="Mis. GPS-BTN-001"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        data-testid="device-id-input"
                      />
                      <Button
                        onClick={handleSaveDeviceProvisioning}
                        disabled={isSavingDeviceId}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white"
                        data-testid="device-id-save"
                      >
                        {isSavingDeviceId ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Simpan Device
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-white/40">
                      Device ID dipakai untuk menghubungkan GPS fisik ke kendaraan ini. Kosongkan nilai untuk melepas perangkat.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
              );
            })()}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-8">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-white/30">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <p>2024 Bintan Island Rental {isPremium ? 'Premium' : 'Standard'} Dashboard</p>
              <VuraSignature className="self-start bg-white/[0.03]" label="Developed by" />
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last update: {new Date().toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </footer>

      {/* Complete Rental Confirmation Dialog */}
      <Dialog open={isCompleteRentalOpen} onOpenChange={setIsCompleteRentalOpen}>
        <DialogContent className="bg-[#0f0f15] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              Selesaikan Sewa
            </DialogTitle>
            <DialogDescription className="text-white/50">
              Konfirmasi pengembalian kendaraan
            </DialogDescription>
          </DialogHeader>

          {vehicleToComplete && (
            <div className="space-y-4 mt-4">
              {/* Vehicle Info */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-3">
                  {vehicleToComplete.imageUrl ? (
                    <VehicleImage
                      src={vehicleToComplete.imageUrl}
                      alt={vehicleToComplete.plateNumber}
                      className="w-12 h-12 rounded-lg object-contain bg-white/5"
                      fallbackClassName="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center"
                      fallbackIconClassName="h-6 w-6 text-white/30"
                      testId="complete-rental-image"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                      <Car className="h-6 w-6 text-white/30" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{vehicleToComplete.plateNumber}</p>
                    <p className="text-sm text-white/50">{vehicleToComplete.brand} {vehicleToComplete.model} ({vehicleToComplete.year})</p>
                  </div>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Konfirmasi</p>
                    <p className="text-sm text-white/70 mt-1">
                      Apakah mobil <span className="font-semibold text-white">{vehicleToComplete.plateNumber}</span> sudah dikembalikan dalam kondisi baik?
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCompleteRentalOpen(false)}
                  className="flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  disabled={isCompletingRental}
                >
                  <X className="h-4 w-4 mr-2" />
                  Batal
                </Button>
                <Button
                  onClick={handleCompleteRental}
                  disabled={isCompletingRental}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                >
                  {isCompletingRental ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Ya, Selesaikan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
