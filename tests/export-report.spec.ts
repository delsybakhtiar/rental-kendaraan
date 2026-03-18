import { expect, test } from '@playwright/test';
import * as XLSX from 'xlsx';
import { buildExcelReport } from '@/lib/export-report';

test.describe('Excel report builder', () => {
  test('menghasilkan workbook admin yang berisi data kendaraan dan sewa aktual', () => {
    const buffer = buildExcelReport({
      exportDate: new Date('2026-03-17T00:00:00.000Z'),
      vehicles: [
        {
          plateNumber: 'BP 1234 AA',
          brand: 'Toyota',
          model: 'Avanza',
          year: 2024,
          color: 'Silver',
          status: 'rented',
          dailyRate: 350000,
          rentals: [
            {
              status: 'active',
              startDate: '2026-03-10T00:00:00.000Z',
              endDate: '2026-03-12T00:00:00.000Z',
              user: { name: 'Budi Santoso' },
            },
          ],
        },
      ],
      rentals: [
        {
          plateNumber: 'BP 1234 AA',
          unit: 'Toyota Avanza',
          customerName: 'Budi Santoso',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-03-12T00:00:00.000Z',
          actualEndDate: null,
          status: 'active',
          totalAmount: 1050000,
          deposit: 300000,
        },
      ],
    });

    const workbook = XLSX.read(buffer, { type: 'buffer' });

    expect(workbook.SheetNames).toEqual(['Data Kendaraan', 'Data Sewa']);

    const vehicleRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Data Kendaraan']);
    const rentalRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Data Sewa']);

    expect(vehicleRows[0]).toMatchObject({
      'Plat Nomor': 'BP 1234 AA',
      Unit: 'Toyota Avanza',
      'Status Kendaraan': 'Disewa',
      'Status Sewa': 'Terlambat',
      Penyewa: 'Budi Santoso',
    });

    expect(rentalRows[0]).toMatchObject({
      'Plat Nomor': 'BP 1234 AA',
      Unit: 'Toyota Avanza',
      Penyewa: 'Budi Santoso',
      Status: 'Terlambat',
      Total: 1050000,
      Deposit: 300000,
    });
  });
});
