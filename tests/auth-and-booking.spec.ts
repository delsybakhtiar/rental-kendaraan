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

  test('katalog mengirim bookingToken saat konfirmasi pembayaran', async ({ page }) => {
    const patchBodies: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
      localStorage.setItem(
        'pendingBooking',
        JSON.stringify({
          id: 'booking-1',
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
    await expect(page.getByRole('dialog')).toContainText('Pembayaran');
    await page.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();

    await expect.poll(() => patchBodies.length).toBe(1);
    expect(patchBodies[0]).toMatchObject({
      status: 'paid',
      bookingToken: 'public-booking-token',
    });
  });
});
