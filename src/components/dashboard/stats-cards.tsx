'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Clock,
  ShieldAlert,
  DollarSign,
  TrendingUp,
  MapPin,
  AlertCircle,
  Fuel,
  Navigation,
  ShieldCheck
} from 'lucide-react';

interface Vehicle {
  id: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  dailyRate: number | { toNumber?: () => number } | unknown;
}

interface StatsCardsProps {
  vehicleStats: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
  };
  activeRentals: number;
  unresolvedAlerts: number;
  recentTracking: number;
  activeGeofences: number;
  revenueStats?: {
    totalPotentialRevenue: number;
    totalDeposit: number;
    avgDailyRate: number;
  };
  vehiclesWithLocation?: Vehicle[];
  isPremium?: boolean;
}

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

// Format short currency (e.g., "800K", "1.2Jt")
function formatShortRupiah(amount: number): string {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)} Jt`;
  } else if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}K`;
  }
  return `Rp ${amount}`;
}

export default function StatsCards({
  vehicleStats,
  activeRentals,
  unresolvedAlerts,
  recentTracking,
  activeGeofences,
  revenueStats,
  vehiclesWithLocation = [],
  isPremium = true,
}: StatsCardsProps) {
  // Calculate vehicles outside Bintan
  const vehiclesOutsideBintan = vehiclesWithLocation.filter(v => 
    v.latitude && v.longitude && !isInsideBintan(v.latitude, v.longitude)
  ).length;

  // Calculate today's revenue (dailyRate of all rented vehicles)
  const todayRevenue = vehiclesWithLocation
    .filter(v => v.status === 'rented')
    .reduce((sum, v) => sum + getDailyRateValue(v.dailyRate), 0);

  // Active vehicles (with location)
  const activeVehicles = vehiclesWithLocation.filter(v => v.latitude && v.longitude).length;

  const stats = [
    {
      title: 'Total Mobil Aktif',
      value: activeVehicles,
      icon: Navigation,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      subValue: `dari ${vehicleStats.total} total`,
      isPremiumOnly: false,
    },
    {
      title: 'Di Luar Zona',
      value: vehiclesOutsideBintan,
      icon: AlertCircle,
      color: vehiclesOutsideBintan > 0 ? 'text-red-500' : 'text-green-500',
      bgColor: vehiclesOutsideBintan > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950',
      subValue: vehiclesOutsideBintan > 0 ? '⚠️ PERINGATAN!' : '✓ Semua dalam zona',
      highlight: vehiclesOutsideBintan > 0,
      isPremiumOnly: true,
    },
    {
      title: 'Revenue Hari Ini',
      value: formatShortRupiah(todayRevenue),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
      subValue: `${vehicleStats.rented} mobil disewa`,
      isText: true,
      isPremiumOnly: false,
    },
    {
      title: 'Tersedia',
      value: vehicleStats.available,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      subValue: 'Siap disewa',
      isPremiumOnly: false,
    },
    {
      title: 'Sewa Aktif',
      value: activeRentals,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      subValue: 'Penyewaan berlangsung',
      isPremiumOnly: false,
    },
    {
      title: 'Alerts',
      value: unresolvedAlerts,
      icon: ShieldAlert,
      color: unresolvedAlerts > 0 ? 'text-red-500' : 'text-gray-500',
      bgColor: unresolvedAlerts > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-gray-50 dark:bg-gray-950',
      subValue: unresolvedAlerts > 0 ? 'Perlu perhatian!' : 'Semua aman',
      highlight: unresolvedAlerts > 0,
      isPremiumOnly: true,
    },
  ];

  // Filter stats based on premium status
  const visibleStats = stats.filter(stat => isPremium || !stat.isPremiumOnly);

  return (
    <div className="space-y-4">
      {/* Premium Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Vehicles Card */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Mobil Terdaftar</p>
                <p className="text-3xl font-bold mt-1">{vehicleStats.total}</p>
                <p className="text-blue-200 text-xs mt-1">
                  {vehicleStats.available} tersedia, {vehicleStats.rented} disewa
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Navigation className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Zone Card - Premium Only */}
        {isPremium ? (
          <Card className={`bg-gradient-to-br ${vehiclesOutsideBintan > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600'} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${vehiclesOutsideBintan > 0 ? 'text-red-100' : 'text-green-100'} text-sm font-medium`}>
                    {vehiclesOutsideBintan > 0 ? '⚠️ Mobil Di Luar Zona' : '✓ Zona Aman'}
                  </p>
                  <p className="text-3xl font-bold mt-1">{vehiclesOutsideBintan}</p>
                  <p className={`${vehiclesOutsideBintan > 0 ? 'text-red-200' : 'text-green-200'} text-xs mt-1`}>
                    {vehiclesOutsideBintan > 0 ? 'Kendaraan keluar dari Bintan!' : 'Semua kendaraan di dalam Bintan'}
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  {vehiclesOutsideBintan > 0 ? (
                    <AlertCircle className="h-8 w-8" />
                  ) : (
                    <ShieldCheck className="h-8 w-8" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Upgrade Premium</p>
                  <p className="text-xl font-bold mt-1">GPS Tracking</p>
                  <p className="text-amber-200 text-xs mt-1">
                    Lacak kendaraan real-time
                  </p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <ShieldCheck className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Revenue Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Estimasi Revenue Hari Ini</p>
                <p className="text-3xl font-bold mt-1">
                  {formatRupiah(todayRevenue)}
                </p>
                <p className="text-emerald-200 text-xs mt-1">
                  Dari {vehicleStats.rented} mobil yang disewa
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regular Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleStats.map((stat) => (
          <Card 
            key={stat.title} 
            className={`hover:shadow-md transition-shadow ${stat.highlight ? 'ring-2 ring-red-300 animate-pulse' : ''}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`${stat.isText ? 'text-lg' : 'text-2xl'} font-bold ${stat.highlight ? 'text-red-600' : ''}`}>
                {stat.value}
              </div>
              <p className={`text-xs mt-1 ${stat.highlight ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                {stat.subValue}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
