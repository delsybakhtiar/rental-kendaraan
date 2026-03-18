import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/jwt';
import { buildExcelReport } from '@/lib/export-report';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const exportDate = new Date();
    const dateStr = exportDate.toISOString().split('T')[0];

    const [vehicles, rentals] = await Promise.all([
      db.vehicle.findMany({
        include: {
          rentals: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.rental.findMany({
        include: {
          vehicle: {
            select: {
              plateNumber: true,
              brand: true,
              model: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
    ]);

    const excelBuffer = buildExcelReport({
      exportDate,
      vehicles: vehicles.map((vehicle) => ({
        plateNumber: vehicle.plateNumber,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        status: vehicle.status,
        dailyRate: Number(vehicle.dailyRate),
        rentals: vehicle.rentals.map((rental) => ({
          status: rental.status,
          startDate: rental.startDate,
          endDate: rental.endDate,
          actualEndDate: rental.actualEndDate,
          user: rental.user,
        })),
      })),
      rentals: rentals.map((rental) => ({
        plateNumber: rental.vehicle.plateNumber,
        unit: `${rental.vehicle.brand} ${rental.vehicle.model}`,
        customerName: rental.user.name,
        startDate: rental.startDate,
        endDate: rental.endDate,
        actualEndDate: rental.actualEndDate,
        status: rental.status,
        totalAmount: Number(rental.totalAmount),
        deposit: Number(rental.deposit),
      })),
    });

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_BintanDrive_${dateStr}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      {
        error: 'Gagal mengekspor data ke Excel',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
