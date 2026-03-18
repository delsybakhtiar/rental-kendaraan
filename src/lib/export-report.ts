import * as XLSX from 'xlsx';
import { formatRentalDate, getLatestRental, getRentalOperationalLabel, getRentalOperationalStatus } from '@/lib/rental-summary';

export interface VehicleExportRow {
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  status: string;
  dailyRate: number;
  rentals?: Array<{
    status: string;
    startDate: Date | string;
    endDate: Date | string;
    actualEndDate?: Date | string | null;
    user?: { name?: string | null } | null;
  }>;
}

export interface RentalExportRow {
  plateNumber: string;
  unit: string;
  customerName: string;
  startDate: Date | string;
  endDate: Date | string;
  actualEndDate?: Date | string | null;
  status: string;
  totalAmount: number;
  deposit: number;
}

function formatVehicleStatus(status: string): string {
  switch (status) {
    case 'available':
      return 'Tersedia';
    case 'rented':
      return 'Disewa';
    case 'maintenance':
      return 'Service';
    case 'emergency':
      return 'Darurat';
    default:
      return status;
  }
}

export function buildExcelReport({
  exportDate,
  vehicles,
  rentals,
}: {
  exportDate: Date;
  vehicles: VehicleExportRow[];
  rentals: RentalExportRow[];
}): Buffer {
  const workbook = XLSX.utils.book_new();
  const exportDateLabel = formatRentalDate(exportDate);

  const vehicleRows = vehicles.map((vehicle, index) => {
    const rental = getLatestRental(vehicle.rentals);
    const rentalStatus = getRentalOperationalStatus(rental, exportDate);

    return {
      No: index + 1,
      'Plat Nomor': vehicle.plateNumber,
      Unit: `${vehicle.brand} ${vehicle.model}`,
      Tahun: vehicle.year,
      Warna: vehicle.color || '-',
      'Status Kendaraan': formatVehicleStatus(vehicle.status),
      'Tarif / Hari': vehicle.dailyRate,
      'Tanggal Mulai Sewa': formatRentalDate(rental?.startDate),
      'Tanggal Akhir Sewa': formatRentalDate(rental?.endDate),
      'Status Sewa': getRentalOperationalLabel(rentalStatus),
      Penyewa: rental?.user?.name || '-',
    };
  });

  const rentalRows = rentals.map((rental, index) => ({
    No: index + 1,
    'Plat Nomor': rental.plateNumber,
    Unit: rental.unit,
    Penyewa: rental.customerName,
    'Tanggal Mulai': formatRentalDate(rental.startDate),
    'Tanggal Akhir': formatRentalDate(rental.endDate),
    'Tanggal Selesai': formatRentalDate(rental.actualEndDate),
    Status: getRentalOperationalLabel(getRentalOperationalStatus(rental, exportDate)),
    Total: rental.totalAmount,
    Deposit: rental.deposit,
  }));

  const vehicleSheet = XLSX.utils.json_to_sheet(vehicleRows);
  const rentalSheet = XLSX.utils.json_to_sheet(rentalRows);

  vehicleSheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 24 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
  ];

  rentalSheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 24 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(workbook, vehicleSheet, 'Data Kendaraan');
  XLSX.utils.book_append_sheet(workbook, rentalSheet, 'Data Sewa');
  workbook.Props = {
    Title: 'Laporan Operasional Rental',
    Subject: `Export admin ${exportDateLabel}`,
    Author: 'Bintan Island Rental',
    CreatedDate: exportDate,
  };

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
}
