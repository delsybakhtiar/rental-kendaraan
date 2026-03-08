'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { format, differenceInDays, addMinutes } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Map,
  Car,
  CalendarDays,
  Clock,
  User,
  Phone,
  MapPin,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Timer,
  RefreshCw,
  MessageCircle,
  Crown,
  Sparkles,
  Star,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Constants
const WHATSAPP_NUMBER = '6281234567890';
const DRIVER_FEE_PER_DAY = 150000;
const PAYMENT_TIMEOUT_MINUTES = 30;

// Types
interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: string;
  dailyRate: number | { toNumber?: () => number };
  imageUrl?: string;
}

interface PendingBooking {
  id: string;
  vehicleId: string;
  vehicle: {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
    year: number;
  };
  startDate: string;
  endDate: string;
  duration: number;
  basePrice: number;
  driverFee: number;
  totalAmount: number;
  rentalOption: string;
  pickupLocation?: string;
  expiresAt: string;
  status: string;
  createdAt: string;
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

export default function KatalogPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [rescheduleDates, setRescheduleDates] = useState<{ start?: Date; end?: Date }>({});

  // Booking form state
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [rentalOption, setRentalOption] = useState<'lepas-kunci' | 'dengan-sopir'>('lepas-kunci');
  const [pickupLocation, setPickupLocation] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Fetch vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const response = await fetch('/api/vehicles');
        const data = await response.json();
        console.log('Vehicles API response:', data);
        if (data.success && data.data) {
          setVehicles(data.data.filter((v: Vehicle) => v.status === 'available'));
        } else if (Array.isArray(data)) {
          // Fallback if API returns array directly
          setVehicles(data.filter((v: Vehicle) => v.status === 'available'));
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // Check for pending booking from localStorage
  useEffect(() => {
    const storedBooking = localStorage.getItem('pendingBooking');
    if (storedBooking) {
      try {
        const booking = JSON.parse(storedBooking);
        if (new Date(booking.expiresAt) > new Date() && booking.status === 'pending') {
          setPendingBooking(booking);
          setPaymentModalOpen(true);
        } else {
          localStorage.removeItem('pendingBooking');
        }
      } catch (error) {
        console.error('Error parsing stored booking:', error);
        localStorage.removeItem('pendingBooking');
      }
    }
  }, []);

  // Duration calculation
  const duration = useMemo(() => {
    if (startDate && endDate) {
      return Math.max(1, differenceInDays(endDate, startDate) + 1);
    }
    return 0;
  }, [startDate, endDate]);

  // Price calculation
  const pricing = useMemo(() => {
    if (!selectedVehicle) return { basePrice: 0, driverFee: 0, total: 0 };
    const dailyRate = getDailyRateValue(selectedVehicle.dailyRate);
    const basePrice = dailyRate * duration;
    const driverFee = rentalOption === 'dengan-sopir' ? DRIVER_FEE_PER_DAY * duration : 0;
    return { basePrice, driverFee, total: basePrice + driverFee };
  }, [selectedVehicle, duration, rentalOption]);

  // Handle booking submission
  const handleBooking = async () => {
    if (!selectedVehicle || !startDate || !endDate) {
      toast({ title: 'Error', description: 'Lengkapi semua data', variant: 'destructive' });
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          duration,
          basePrice: pricing.basePrice,
          driverFee: pricing.driverFee,
          totalAmount: pricing.total,
          rentalOption,
          pickupLocation,
          customerName,
          customerPhone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPendingBooking(data.data);
        localStorage.setItem('pendingBooking', JSON.stringify(data.data));
        setBookingModalOpen(false);
        setPaymentModalOpen(true);
        toast({ title: 'Booking Dibuat', description: 'Silakan lakukan pembayaran dalam 30 menit' });
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat booking', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!pendingBooking) return;
    
    setProcessingPayment(true);
    try {
      const response = await fetch(`/api/bookings/${pendingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Pembayaran Berhasil', description: 'Kendaraan berhasil dipesan!' });
        localStorage.removeItem('pendingBooking');
        setPaymentModalOpen(false);
        setPendingBooking(null);
        // Refresh vehicles
        const vehiclesResponse = await fetch('/api/vehicles');
        const vehiclesData = await vehiclesResponse.json();
        if (vehiclesData.success) {
          setVehicles(vehiclesData.data.filter((v: Vehicle) => v.status === 'available'));
        }
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal konfirmasi pembayaran', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    if (!pendingBooking) return;

    try {
      await fetch(`/api/bookings/${pendingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      // Open WhatsApp with cancel message
      const message = `Halo Admin, saya ingin membatalkan pesanan mobil:

📦 *Detail Pesanan:*
- ID Booking: ${pendingBooking.id}
- Mobil: ${pendingBooking.vehicle.brand} ${pendingBooking.vehicle.model} (${pendingBooking.vehicle.plateNumber})
- Tanggal: ${format(new Date(pendingBooking.startDate), 'dd MMM yyyy', { locale: id })} - ${format(new Date(pendingBooking.endDate), 'dd MMM yyyy', { locale: id })}
- Total: ${formatRupiah(pendingBooking.totalAmount)}

Mohon konfirmasi pembatalan. Terima kasih.`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
      
      localStorage.removeItem('pendingBooking');
      setPaymentModalOpen(false);
      setPendingBooking(null);
      
      // Refresh vehicles
      const vehiclesResponse = await fetch('/api/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      if (vehiclesData.success) {
        setVehicles(vehiclesData.data.filter((v: Vehicle) => v.status === 'available'));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membatalkan booking', variant: 'destructive' });
    }
  };

  // Handle reschedule via WhatsApp
  const handleReschedule = () => {
    if (!pendingBooking || !rescheduleDates.start || !rescheduleDates.end) return;

    const message = `Halo Admin, saya ingin mengubah jadwal pesanan mobil:

📦 *Detail Pesanan:*
- ID Booking: ${pendingBooking.id}
- Mobil: ${pendingBooking.vehicle.brand} ${pendingBooking.vehicle.model} (${pendingBooking.vehicle.plateNumber})

📅 *Jadwal Lama:*
- ${format(new Date(pendingBooking.startDate), 'dd MMM yyyy', { locale: id })} - ${format(new Date(pendingBooking.endDate), 'dd MMM yyyy', { locale: id })}
- Durasi: ${pendingBooking.duration} hari

📅 *Jadwal Baru:*
- ${format(rescheduleDates.start, 'dd MMM yyyy', { locale: id })} - ${format(rescheduleDates.end, 'dd MMM yyyy', { locale: id })}
- Durasi: ${differenceInDays(rescheduleDates.end, rescheduleDates.start) + 1} hari

Mohon konfirmasi perubahan jadwal. Terima kasih.`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    setRescheduleDates({});
  };

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!pendingBooking) return;

    const updateTimer = () => {
      const expiresAt = new Date(pendingBooking.expiresAt);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        handleExpireBooking();
      } else {
        setTimeLeft({
          minutes: Math.floor(diff / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [pendingBooking]);

  // Handle expire booking
  const handleExpireBooking = async () => {
    if (!pendingBooking) return;

    try {
      await fetch(`/api/bookings/${pendingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'expired' }),
      });

      localStorage.removeItem('pendingBooking');
      setPaymentModalOpen(false);
      setPendingBooking(null);
      setRescheduleDates({});
      
      toast({
        title: 'Sesi Pembayaran Berakhir',
        description: 'Silakan buat booking baru',
        variant: 'destructive',
      });

      // Refresh vehicles
      const vehiclesResponse = await fetch('/api/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      if (vehiclesData.success) {
        setVehicles(vehiclesData.data.filter((v: Vehicle) => v.status === 'available'));
      }
    } catch (error) {
      console.error('Error expiring booking:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/15 to-cyan-600/15 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a0f_70%)]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-lg opacity-50"></div>
                <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                  <Map className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Bintan Island
                </h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Vehicle Catalog</p>
              </div>
            </Link>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-white/5 border-white/10 text-white/60 gap-1">
                <Car className="h-3 w-3" />
                {vehicles.length} Tersedia
              </Badge>
              <Link href="/admin/login">
                <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/5">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-blue-300">Pilih Kendaraan Impian Anda</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Katalog Mobil
            </span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Pilih kendaraan yang sesuai dengan kebutuhan Anda. Semua kendaraan dilengkapi dengan GPS tracking untuk keamanan.
          </p>
        </div>

        {/* Vehicles Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-white/30" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-20">
            <Car className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">Tidak ada kendaraan tersedia saat ini</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="group bg-white/[0.02] border-white/10 hover:border-blue-500/30 transition-all duration-300 overflow-hidden"
              >
                {/* Vehicle Image */}
                <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                  {vehicle.imageUrl ? (
                    <img 
                      src={vehicle.imageUrl} 
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="h-16 w-16 text-white/10" />
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] to-transparent opacity-60"></div>
                  {/* Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Tersedia
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white text-lg">
                        {vehicle.brand} {vehicle.model}
                      </h3>
                      <p className="text-sm text-white/40">{vehicle.plateNumber}</p>
                    </div>
                    <Badge variant="secondary" className="bg-white/5 text-white/60">
                      {vehicle.year}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-white/40 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-white/20" style={{ backgroundColor: vehicle.color.toLowerCase() }}></span>
                      {vehicle.color}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/40">Tarif per hari</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        {formatRupiah(getDailyRateValue(vehicle.dailyRate))}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setBookingModalOpen(true);
                      }}
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                    >
                      Pesan
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-16 pt-16 border-t border-white/5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">Kenapa Memilih Kami?</h2>
            <p className="text-white/40">Fitur unggulan untuk kenyamanan Anda</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'GPS Tracking',
                description: 'Pantau posisi kendaraan secara real-time',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Clock,
                title: '24/7 Support',
                description: 'Tim support siap membantu kapan saja',
                gradient: 'from-amber-500 to-orange-500'
              },
              {
                icon: CheckCircle2,
                title: 'Mudah & Cepat',
                description: 'Proses booking dan pembayaran simpel',
                gradient: 'from-green-500 to-emerald-500'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/40">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <Car className="h-5 w-5 text-blue-500" />
              Form Pemesanan
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedVehicle?.brand} {selectedVehicle?.model}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full bg-gray-50 border-gray-200 text-gray-900 justify-start">
                      <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
                      {startDate ? format(startDate, 'dd MMM yyyy', { locale: id }) : 'Pilih'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date && (!endDate || endDate < date)) {
                          setEndDate(date);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Tanggal Selesai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full bg-gray-50 border-gray-200 text-gray-900 justify-start">
                      <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
                      {endDate ? format(endDate, 'dd MMM yyyy', { locale: id }) : 'Pilih'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Rental Option */}
            <div className="space-y-2">
              <Label className="text-gray-700">Opsi Rental</Label>
              <Select value={rentalOption} onValueChange={(v) => setRentalOption(v as 'lepas-kunci' | 'dengan-sopir')}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="lepas-kunci">Lepas Kunci</SelectItem>
                  <SelectItem value="dengan-sopir">Dengan Sopir (+{formatRupiah(DRIVER_FEE_PER_DAY)}/hari)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Nama</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Anda"
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">No. HP</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Pickup Location */}
            <div className="space-y-2">
              <Label className="text-gray-700">Lokasi Pickup (opsional)</Label>
              <Input
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Alamat lengkap"
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
              />
            </div>

            {/* Price Summary */}
            {duration > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{formatRupiah(getDailyRateValue(selectedVehicle?.dailyRate))} × {duration} hari</span>
                  <span className="text-gray-900">{formatRupiah(pricing.basePrice)}</span>
                </div>
                {pricing.driverFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sopir ({duration} hari)</span>
                    <span className="text-gray-900">{formatRupiah(pricing.driverFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                    {formatRupiah(pricing.total)}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleBooking}
              disabled={!startDate || !endDate || processingPayment}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {processingPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Buat Pesanan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <CreditCard className="h-5 w-5 text-amber-500" />
              Pembayaran
            </DialogTitle>
          </DialogHeader>

          {pendingBooking && (
            <div className="space-y-4 mt-4">
              {/* Timer */}
              {timeLeft && (
                <div className={`flex items-center justify-center gap-2 p-4 rounded-xl ${
                  timeLeft.minutes < 5 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <Timer className={`h-5 w-5 ${timeLeft.minutes < 5 ? 'text-red-500' : 'text-amber-500'}`} />
                  <span className={`font-mono text-2xl font-bold ${timeLeft.minutes < 5 ? 'text-red-500' : 'text-amber-500'}`}>
                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Booking Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Kendaraan</span>
                  <span className="text-gray-900">{pendingBooking.vehicle.brand} {pendingBooking.vehicle.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal</span>
                  <span className="text-gray-900">
                    {format(new Date(pendingBooking.startDate), 'dd MMM', { locale: id })} - {format(new Date(pendingBooking.endDate), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Durasi</span>
                  <span className="text-gray-900">{pendingBooking.duration} hari</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent text-lg">
                    {formatRupiah(pendingBooking.totalAmount)}
                  </span>
                </div>
              </div>

              {/* QRIS Code */}
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `QRIS:BINTAN-RENTAL:${pendingBooking.id}:${pendingBooking.totalAmount}:IDR`
                    )}&bgcolor=ffffff&color=000000&ecc=H`}
                    alt="QRIS Payment Code"
                    className="mx-auto rounded-lg"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">Scan QRIS untuk Membayar</p>
                  <p className="text-xs text-slate-500">
                    ID: {pendingBooking.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatRupiah(pendingBooking.totalAmount)}
                  </p>
                </div>
                {/* QRIS Logo */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="8" height="8" rx="1" fill="#1a1a1a"/>
                      <rect x="14" y="2" width="8" height="8" rx="1" fill="#1a1a1a"/>
                      <rect x="2" y="14" width="8" height="8" rx="1" fill="#1a1a1a"/>
                      <rect x="14" y="14" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="18" y="14" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="14" y="18" width="3" height="3" fill="#1a1a1a"/>
                      <rect x="18" y="18" width="3" height="3" fill="#1a1a1a"/>
                    </svg>
                    <span className="text-xs font-bold text-slate-700">QRIS</span>
                  </div>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">Diterima di semua merchant</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handlePaymentConfirm}
                  disabled={processingPayment || !timeLeft}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  {processingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCancelBooking}
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Batalkan
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                  >
                    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Halo Admin, saya ingin konfirmasi pembayaran untuk booking ID: ' + pendingBooking.id)}`} target="_blank">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </a>
                  </Button>
                </div>

                {/* Reschedule */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <p className="text-sm text-gray-600 text-center">Butuh ubah jadwal?</p>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 bg-gray-50 border-gray-200 text-gray-600">
                          <CalendarDays className="h-4 w-4 mr-1" />
                          {rescheduleDates.start ? format(rescheduleDates.start, 'dd MMM yyyy', { locale: id }) : 'Mulai'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                        <Calendar
                          mode="single"
                          selected={rescheduleDates.start}
                          onSelect={(date) => setRescheduleDates(prev => ({ ...prev, start: date }))}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 bg-gray-50 border-gray-200 text-gray-600">
                          <CalendarDays className="h-4 w-4 mr-1" />
                          {rescheduleDates.end ? format(rescheduleDates.end, 'dd MMM yyyy', { locale: id }) : 'Selesai'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border-gray-200">
                        <Calendar
                          mode="single"
                          selected={rescheduleDates.end}
                          onSelect={(date) => setRescheduleDates(prev => ({ ...prev, end: date }))}
                          disabled={(date) => date < (rescheduleDates.start || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {rescheduleDates.start && rescheduleDates.end && (
                    <Button
                      variant="outline"
                      onClick={handleReschedule}
                      className="w-full border-amber-500/30 text-amber-500 hover:bg-amber-50"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Ajukan Ubah Jadwal via WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
            <p>© 2024 Bintan Island Rental. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" className="flex items-center gap-1 hover:text-green-400 transition-colors">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
