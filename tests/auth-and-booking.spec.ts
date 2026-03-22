import { expect, test, type Page, type Route } from '@playwright/test';

async function mockJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function bootstrapAdminApis(page: Page) {
  await page.route('**/api/dashboard', (route) =>
    mockJson(route, {
      vehicleStats: { total: 0, available: 0, rented: 0, maintenance: 0 },
      activeRentals: 0,
      unresolvedAlerts: 0,
      recentTracking: 0,
      activeGeofences: 0,
      recentAlerts: [],
      vehiclesWithLocation: [],
      geofences: [],
      revenueStats: { totalPotentialRevenue: 0, totalDeposit: 0, avgDailyRate: 0 },
    }),
  );
  await page.route('**/api/vehicles?*', (route) => mockJson(route, { success: true, data: [] }));
  await page.route('**/api/geofences?*', (route) => mockJson(route, { success: true, data: [] }));
  await page.route('**/api/geofences/alerts?*', (route) => mockJson(route, { success: true, data: [] }));
  await page.route('**/api/tracking/**', (route) => mockJson(route, { vehicle: {}, logs: [], totalPoints: 0 }));
}

test.describe('Auth and public booking flows', () => {
  test('endpoint detail kendaraan admin menolak request tanpa token', async ({ request }) => {
    const response = await request.get('/api/vehicles/vehicle-1');

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  test('endpoint rent kendaraan menolak request tanpa token', async ({ request }) => {
    const response = await request.post('/api/vehicles/vehicle-1/rent', {
      data: {
        price: 300000,
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Authentication required',
    });
  });

  test('admin login menyimpan session dan redirect ke dashboard', async ({ page }) => {
    await bootstrapAdminApis(page);
    await page.route('**/api/auth/login', (route) =>
      mockJson(route, {
        success: true,
        data: {
          token: 'jwt-admin-token',
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            name: 'Admin Playwright',
            role: 'admin',
            accountType: 'standard',
          },
        },
      }),
    );

    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('secret123');
    await page.getByRole('button', { name: 'Masuk Dashboard' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          token: localStorage.getItem('token'),
          user: localStorage.getItem('user'),
        })),
      )
      .toEqual({
        token: 'jwt-admin-token',
        user: JSON.stringify({
          id: 'admin-1',
          email: 'admin@example.com',
          name: 'Admin Playwright',
          role: 'admin',
          accountType: 'standard',
        }),
      });
  });

  test('katalog mengirim bookingToken dan membuka konfirmasi WhatsApp saat pembayaran dikonfirmasi', async ({ page }) => {
    const patchBodies: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
      (window as typeof window & { __lastOpenedUrl?: string }).__lastOpenedUrl = '';
      window.open = ((url?: string | URL) => {
        (window as typeof window & { __lastOpenedUrl?: string }).__lastOpenedUrl = String(url ?? '');
        return {} as Window;
      }) as typeof window.open;
      localStorage.setItem(
        'pendingBooking',
        JSON.stringify({
          id: 'booking-1',
          bookingCode: 'OTM-9X3K2Q',
          vehicleId: 'vehicle-1',
          vehicle: {
            id: 'vehicle-1',
            plateNumber: 'BP 1234 AA',
            brand: 'Toyota',
            model: 'Avanza',
            year: 2024,
          },
          startDate: '2026-03-20T00:00:00.000Z',
          endDate: '2026-03-22T00:00:00.000Z',
          duration: 3,
          basePrice: 900000,
          driverFee: 0,
          totalAmount: 900000,
          rentalOption: 'lepas-kunci',
          pickupLocation: 'Bandara',
          expiresAt: '2099-03-22T00:00:00.000Z',
          bookingToken: 'public-booking-token',
          status: 'pending',
          createdAt: '2026-03-14T00:00:00.000Z',
        }),
      );
    });

    await page.route('**/api/vehicles', (route) =>
      mockJson(route, {
        success: true,
        data: [
          {
            id: 'vehicle-1',
            plateNumber: 'BP 1234 AA',
            brand: 'Toyota',
            model: 'Avanza',
            year: 2024,
            color: 'Silver',
            status: 'available',
            dailyRate: 300000,
          },
        ],
      }),
    );
    await page.route('**/api/bookings/booking-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBodies.push(route.request().postDataJSON() as Record<string, unknown>);
      }
      await mockJson(route, { success: true, data: { status: 'active' } });
    });

    await page.goto('/katalog');
    const paymentDialog = page.getByRole('dialog');
    await expect(paymentDialog).toContainText('Pembayaran');
    await expect(paymentDialog.getByRole('button', { name: 'Konfirmasi Pembayaran' })).toBeVisible();
    await paymentDialog.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();

    await expect.poll(() => patchBodies.length).toBe(1);
    expect(patchBodies[0]).toMatchObject({
      status: 'paid',
      bookingToken: 'public-booking-token',
    });

    await expect
      .poll(() =>
        page.evaluate(() => (window as typeof window & { __lastOpenedUrl?: string }).__lastOpenedUrl ?? ''),
      )
      .toContain('https://wa.me/');

    const openedUrl = await page.evaluate(
      () => (window as typeof window & { __lastOpenedUrl?: string }).__lastOpenedUrl ?? '',
    );

    expect(openedUrl).toContain('OTM-9X3K2Q');
    expect(openedUrl).toContain('Toyota%20Avanza');
    expect(openedUrl).toContain('BP%201234%20AA');
    expect(openedUrl).toContain('Bandara');
    expect(openedUrl).toContain('900.000');
    expect(openedUrl).not.toContain('booking-1');
  });

  test('katalog menampilkan booking code pendek dan memakainya di CTA WhatsApp', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'pendingBooking',
        JSON.stringify({
          id: 'booking-2',
          bookingCode: 'OTM-7K4P9R',
          vehicleId: 'vehicle-2',
          vehicle: {
            id: 'vehicle-2',
            plateNumber: 'BP 5678 CD',
            brand: 'Honda',
            model: 'Brio',
            year: 2024,
          },
          startDate: '2026-03-21T00:00:00.000Z',
          endDate: '2026-03-23T00:00:00.000Z',
          duration: 3,
          basePrice: 750000,
          driverFee: 0,
          totalAmount: 750000,
          rentalOption: 'lepas-kunci',
          pickupLocation: 'Tanjung Pinang',
          expiresAt: '2099-03-22T00:00:00.000Z',
          bookingToken: 'public-booking-token-2',
          status: 'pending',
          createdAt: '2026-03-14T00:00:00.000Z',
        }),
      );
    });

    await page.route('**/api/vehicles', (route) =>
      mockJson(route, {
        success: true,
        data: [
          {
            id: 'vehicle-2',
            plateNumber: 'BP 5678 CD',
            brand: 'Honda',
            model: 'Brio',
            year: 2024,
            color: 'Red',
            status: 'available',
            dailyRate: 250000,
          },
        ],
      }),
    );
    await page.route('**/api/bookings/booking-2', async (route) => {
      await mockJson(route, { success: true, data: { status: 'cancelled' } });
    });

    await page.goto('/katalog');
    const dialog = page.getByRole('dialog');

    await expect(dialog).toContainText('Kode Booking: OTM-7K4P9R');

    const whatsappLink = dialog.getByRole('link', { name: 'WhatsApp' });
    await expect(whatsappLink).toHaveAttribute('href', /OTM-7K4P9R/);
    await expect(whatsappLink).not.toHaveAttribute('href', /booking-2/);
  });

  test('form pemesanan mobile merapikan kalender dan mempercepat alur pilih tanggal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route('**/api/vehicles', (route) =>
      mockJson(route, {
        success: true,
        data: [
          {
            id: 'vehicle-1',
            plateNumber: 'BP 1234 AA',
            brand: 'Toyota',
            model: 'Avanza',
            year: 2024,
            color: 'Silver',
            status: 'available',
            dailyRate: 300000,
          },
        ],
      }),
    );

    await page.goto('/katalog');
    await page.getByRole('button', { name: 'Pesan' }).click();

    const startTrigger = page.getByTestId('booking-start-date-trigger');
    const endTrigger = page.getByTestId('booking-end-date-trigger');
    const rentalOptionTrigger = page.getByTestId('rental-option-trigger');

    await expect(startTrigger).toBeVisible();
    await expect(endTrigger).toBeVisible();
    await expect(startTrigger).toContainText('Pilih');

    await startTrigger.click();

    const startCalendar = page.locator('[data-slot="calendar"]').last();
    const firstSelectableDay = startCalendar.locator('button[data-day]:not([disabled])').first();

    await expect(startCalendar).toBeVisible();
    await expect(startCalendar.getByText('Sen', { exact: true })).toBeVisible();
    await expect(firstSelectableDay).toHaveClass(/text-slate-900/);

    await firstSelectableDay.click();

    await expect(endTrigger).not.toContainText('Pilih');
    await expect(endTrigger).toHaveAttribute('data-state', 'open');

    const endCalendar = page.locator('[data-slot="calendar"]').last();
    const endDay = endCalendar.locator('button[data-day]:not([disabled])').nth(1);

    await endDay.click();
    await expect(rentalOptionTrigger).toBeFocused();
  });
});
