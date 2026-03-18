'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Clock,
  XCircle,
  CheckCircle2,
  Timer,
  Phone,
  CalendarDays,
  Car,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface PendingBooking {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  duration: number;
  basePrice: number;
  driverFee: number;
  totalAmount: number;
  rentalOption: string;
  pickupLocation: string | null;
  expiresAt: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
  vehicle: {
    id: string;
    plateNumber: string;
    brand: string;
    model: string;
    year: number;
    status: string;
  };
}

interface PendingBookingsPanelProps {
  onBookingUpdate?: () => void;
}

function formatRupiah(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatTimeRemaining(expiresAt: string): { text: string; isLow: boolean; isExpired: boolean } {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = Math.max(0, Math.floor((expires - now) / 1000));
  
  if (diff <= 0) {
    return { text: 'Waktu Habis', isLow: true, isExpired: true };
  }
  
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  const isLow = diff <= 300;
  
  return {
    text: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    isLow,
    isExpired: false,
  };
}

export default function PendingBookingsPanel({ onBookingUpdate }: PendingBookingsPanelProps) {
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; booking: PendingBooking | null }>({
    open: false,
    booking: null,
  });
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings?status=pending', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelBooking = async () => {
    if (!cancelDialog.booking) return;
    
    setIsCancelling(true);
    
    try {
      const response = await fetch(`/api/bookings/${cancelDialog.booking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Pesanan Dibatalkan', {
          description: `Pesanan untuk ${cancelDialog.booking.vehicle.plateNumber} telah dibatalkan.`,
        });
        setCancelDialog({ open: false, booking: null });
        fetchBookings();
        onBookingUpdate?.();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error canceling booking:', error);
      toast.error('Gagal Membatalkan', {
        description: 'Terjadi kesalahan saat membatalkan pesanan.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Memuat pesanan pending...
        </CardContent>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">Tidak ada pesanan pending</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2 text-amber-700">
              <Timer className="w-5 h-5" />
              Pesanan Pending ({bookings.length})
            </span>
            <Button variant="ghost" size="sm" onClick={fetchBookings}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 p-3">
              {bookings.map((booking) => {
                const timeInfo = formatTimeRemaining(booking.expiresAt);
                const optionLabel = booking.rentalOption === 'lepas-kunci' ? 'Lepas Kunci' : 'Dengan Sopir';
                
                return (
                  <div
                    key={booking.id}
                    className={`p-3 rounded-lg border ${
                      timeInfo.isExpired
                        ? 'border-red-300 bg-red-50'
                        : timeInfo.isLow
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{booking.vehicle.plateNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {booking.vehicle.brand} {booking.vehicle.model}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {booking.id.slice(0, 12)}...
                        </p>
                      </div>
                      <div className={`text-right ${timeInfo.isLow ? 'text-red-600' : 'text-amber-600'}`}>
                        <div className="flex items-center gap-1 font-mono font-bold">
                          <Clock className="w-4 h-4" />
                          {timeInfo.text}
                        </div>
                        <p className="text-xs">menit tersisa</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-muted-foreground" />
                        <span>{booking.duration} hari</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground">{optionLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-emerald-600">{formatRupiah(booking.totalAmount)}</p>
                      </div>
                      <div className="flex gap-2">
                        {booking.customerPhone && (
                          <a
                            href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200"
                          >
                            <Phone className="w-3 h-3" />
                            WhatsApp
                          </a>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setCancelDialog({ open: true, booking })}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, booking: cancelDialog.booking })}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Batalkan Pesanan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Anda akan membatalkan pesanan secara manual:
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Kendaraan:</strong> {cancelDialog.booking?.vehicle.plateNumber}</p>
                <p><strong>Durasi:</strong> {cancelDialog.booking?.duration} hari</p>
                <p><strong>Total:</strong> {cancelDialog.booking ? formatRupiah(cancelDialog.booking.totalAmount) : '-'}</p>
              </div>
              <p className="mt-3 text-amber-600 text-sm">
                Kendaraan akan dikembalikan ke status "Tersedia".
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? 'Memproses...' : 'Ya, Batalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
