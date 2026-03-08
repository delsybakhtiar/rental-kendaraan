import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execSync } from 'child_process';
import * as fs from 'fs';

// Generate Excel file using Python script
export async function GET(request: NextRequest) {
  try {
    // Get current date for filename
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Fetch vehicles data
    const vehicles = await db.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Fetch rentals for revenue calculation
    const rentals = await db.rental.findMany({
      where: { status: 'completed' },
      include: { vehicle: true },
    });

    // Calculate total revenue
    const totalRevenue = rentals.reduce((sum, rental) => {
      const amount = rental.totalAmount ? Number(rental.totalAmount) : 0;
      return sum + amount;
    }, 0);

    // Prepare data for Excel - convert to simple JSON objects
    const vehicleData = vehicles.map((v, index) => ({
      no: index + 1,
      plateNumber: v.plateNumber,
      unit: `${v.brand} ${v.model}`,
      year: v.year,
      color: v.color || '-',
      status: v.status === 'available' ? 'Tersedia' : v.status === 'rented' ? 'Disewa' : 'Service',
      dailyRate: Number(v.dailyRate),
    }));

    // Activity log data
    const now = Date.now();
    const activityData = [
      { date: new Date(now - 2 * 60 * 60 * 1000).toLocaleDateString('id-ID'), activity: 'Sewa Selesai', plate: 'BP 1234 AA', unit: 'Toyota Avanza', status: 'Selesai', amount: 0 },
      { date: new Date(now - 5 * 60 * 60 * 1000).toLocaleDateString('id-ID'), activity: 'Pembayaran Dikonfirmasi', plate: '-', unit: 'Booking #1029', status: 'Lunas', amount: 500000 },
      { date: new Date(now - 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'), activity: 'Status Update', plate: 'BP 5678 CD', unit: 'Suzuki Ertiga', status: 'Servis Rutin', amount: 0 },
      { date: new Date(now - 26 * 60 * 60 * 1000).toLocaleDateString('id-ID'), activity: 'Booking Baru', plate: 'BP 9012 EF', unit: 'Honda Jazz', status: 'Disewa', amount: 0 },
      { date: new Date(now - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID'), activity: 'Kendaraan Baru', plate: 'BP 3456 GH', unit: 'Mitsubishi Xpander', status: 'Tersedia', amount: 0 },
    ];

    const outputPath = `/tmp/Laporan_BintanDrive_${dateStr}.xlsx`;
    
    // Escape JSON strings for Python
    const vehicleJson = JSON.stringify(vehicleData).replace(/'/g, "\\'");
    const activityJson = JSON.stringify(activityData).replace(/'/g, "\\'");
    
    // Create Python script
    const pythonScript = `
import json
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# Create workbook
wb = Workbook()

# ===== SHEET 1: LAPORAN KENDARAAN =====
ws1 = wb.active
ws1.title = "Data Kendaraan"

# Styles
title_font = Font(name='Arial', size=16, bold=True, color='1B4332')
header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
header_fill = PatternFill(start_color='2D6A4F', end_color='2D6A4F', fill_type='solid')
alt_fill = PatternFill(start_color='E8F5E9', end_color='E8F5E9', fill_type='solid')
data_font = Font(name='Arial', size=10)
thin_border = Border(
    left=Side(style='thin', color='CCCCCC'),
    right=Side(style='thin', color='CCCCCC'),
    top=Side(style='thin', color='CCCCCC'),
    bottom=Side(style='thin', color='CCCCCC')
)
center_align = Alignment(horizontal='center', vertical='center')
left_align = Alignment(horizontal='left', vertical='center')

# Title
ws1['A1'] = 'LAPORAN KENDARAAN - BINTAN ISLAND RENTAL'
ws1['A1'].font = title_font
ws1.merge_cells('A1:G1')
ws1['A2'] = 'Tanggal Export: ${dateStr}'
ws1['A2'].font = Font(name='Arial', size=10, italic=True, color='666666')

# Headers
headers = ['No', 'Plat Nomor', 'Unit', 'Tahun', 'Warna', 'Status', 'Tarif/Hari']
for col, header in enumerate(headers, 1):
    cell = ws1.cell(row=4, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align
    cell.border = thin_border

# Vehicle data - parse JSON
vehicles = json.loads('${vehicleJson}')
for row_idx, v in enumerate(vehicles, 5):
    ws1.cell(row=row_idx, column=1, value=v['no']).alignment = center_align
    ws1.cell(row=row_idx, column=2, value=v['plateNumber']).alignment = center_align
    ws1.cell(row=row_idx, column=3, value=v['unit']).alignment = left_align
    ws1.cell(row=row_idx, column=4, value=v['year']).alignment = center_align
    ws1.cell(row=row_idx, column=5, value=v['color']).alignment = center_align
    ws1.cell(row=row_idx, column=6, value=v['status']).alignment = center_align
    rate_cell = ws1.cell(row=row_idx, column=7, value=v['dailyRate'])
    rate_cell.number_format = '#,##0'
    rate_cell.font = Font(name='Arial', size=10, color='1B4332')
    
    for col in range(1, 8):
        ws1.cell(row=row_idx, column=col).border = thin_border
        ws1.cell(row=row_idx, column=col).font = data_font
    
    if row_idx % 2 == 0:
        for col in range(1, 8):
            ws1.cell(row=row_idx, column=col).fill = alt_fill

# Column widths
ws1.column_dimensions['A'].width = 5
ws1.column_dimensions['B'].width = 15
ws1.column_dimensions['C'].width = 25
ws1.column_dimensions['D'].width = 8
ws1.column_dimensions['E'].width = 12
ws1.column_dimensions['F'].width = 12
ws1.column_dimensions['G'].width = 15

# Summary row
summary_row = len(vehicles) + 6
ws1.cell(row=summary_row, column=1, value='TOTAL KENDARAAN:').font = Font(name='Arial', size=11, bold=True)
ws1.merge_cells(f'A{summary_row}:B{summary_row}')
ws1.cell(row=summary_row, column=3, value=len(vehicles)).font = Font(name='Arial', size=11, bold=True, color='2D6A4F')

# Total revenue
ws1.cell(row=summary_row + 1, column=1, value='TOTAL PENDAPATAN:').font = Font(name='Arial', size=11, bold=True)
ws1.merge_cells(f'A{summary_row + 1}:B{summary_row + 1}')
rev_cell = ws1.cell(row=summary_row + 1, column=3, value=${totalRevenue})
rev_cell.number_format = '"Rp "#,##0'
rev_cell.font = Font(name='Arial', size=11, bold=True, color='1B4332')

# ===== SHEET 2: LOG AKTIVITAS =====
ws2 = wb.create_sheet('Log Aktivitas')

# Title
ws2['A1'] = 'LOG AKTIVITAS TERBARU - BINTAN ISLAND RENTAL'
ws2['A1'].font = title_font
ws2.merge_cells('A1:F1')
ws2['A2'] = 'Tanggal Export: ${dateStr}'
ws2['A2'].font = Font(name='Arial', size=10, italic=True, color='666666')

# Headers
activity_headers = ['Tanggal', 'Aktivitas', 'Plat Nomor', 'Unit', 'Status', 'Jumlah']
for col, header in enumerate(activity_headers, 1):
    cell = ws2.cell(row=4, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = center_align
    cell.border = thin_border

# Activity data - parse JSON
activities = json.loads('${activityJson}')
for row_idx, a in enumerate(activities, 5):
    ws2.cell(row=row_idx, column=1, value=a['date']).alignment = center_align
    ws2.cell(row=row_idx, column=2, value=a['activity']).alignment = left_align
    ws2.cell(row=row_idx, column=3, value=a['plate']).alignment = center_align
    ws2.cell(row=row_idx, column=4, value=a['unit']).alignment = left_align
    ws2.cell(row=row_idx, column=5, value=a['status']).alignment = center_align
    
    if a['amount'] > 0:
        amount_cell = ws2.cell(row=row_idx, column=6, value=a['amount'])
        amount_cell.number_format = '"Rp "#,##0'
        amount_cell.font = Font(name='Arial', size=10, color='1B4332')
    else:
        ws2.cell(row=row_idx, column=6, value='-').alignment = center_align
    
    for col in range(1, 7):
        ws2.cell(row=row_idx, column=col).border = thin_border
        ws2.cell(row=row_idx, column=col).font = data_font
    
    if row_idx % 2 == 0:
        for col in range(1, 7):
            ws2.cell(row=row_idx, column=col).fill = alt_fill

# Column widths for activity sheet
ws2.column_dimensions['A'].width = 15
ws2.column_dimensions['B'].width = 22
ws2.column_dimensions['C'].width = 12
ws2.column_dimensions['D'].width = 22
ws2.column_dimensions['E'].width = 15
ws2.column_dimensions['F'].width = 15

# Save to output path
output_path = '${outputPath}'
wb.save(output_path)
print(output_path)
`;

    // Write Python script to temp file
    const scriptPath = `/tmp/export_excel_${Date.now()}.py`;
    fs.writeFileSync(scriptPath, pythonScript);

    // Execute Python script
    const generatedPath = execSync(`python3 ${scriptPath}`, { encoding: 'utf-8', timeout: 30000 }).trim();

    // Read the generated Excel file
    const excelBuffer = fs.readFileSync(generatedPath);

    // Cleanup temp files
    fs.unlinkSync(scriptPath);
    if (fs.existsSync(generatedPath)) {
      fs.unlinkSync(generatedPath);
    }

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Laporan_BintanDrive_${dateStr}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { error: 'Gagal mengekspor data ke Excel', details: String(error) },
      { status: 500 }
    );
  }
}
