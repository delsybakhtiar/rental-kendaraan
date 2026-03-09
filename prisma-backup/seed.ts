import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Sample coordinates for Jakarta area
const jakartaCenter = {
  latitude: -6.2088,
  longitude: 106.8456,
};

// Sample vehicle locations around Jakarta
const sampleLocations = [
  { lat: -6.1751, lng: 106.8650 }, // Monas
  { lat: -6.1944, lng: 106.8229 }, // Bundaran HI
  { lat: -6.2297, lng: 106.8295 }, // Blok M
  { lat: -6.1944, lng: 106.8644 }, // Menteng
  { lat: -6.2615, lng: 106.8106 }, // Kemang
];

// Sample geofence polygon (roughly Jakarta CBD area)
const jakartaCbdPolygon = JSON.stringify([
  [106.8200, -6.1600], // Northwest
  [106.8600, -6.1600], // Northeast
  [106.8600, -6.2100], // Southeast
  [106.8200, -6.2100], // Southwest
  [106.8200, -6.1600], // Close polygon
]);

const southJakartaPolygon = JSON.stringify([
  [106.7900, -6.2200],
  [106.8400, -6.2200],
  [106.8400, -6.2800],
  [106.7900, -6.2800],
  [106.7900, -6.2200],
]);

const airportPolygon = JSON.stringify([
  [106.6400, -6.1000],
  [106.6800, -6.1000],
  [106.6800, -6.1400],
  [106.6400, -6.1400],
  [106.6400, -6.1000],
]);

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.geofenceAlert.deleteMany();
  await prisma.trackingLog.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const customerPasswordHash = await bcrypt.hash('customer123', salt);

  // Create admin users with different tiers
  const adminStandard = await prisma.user.create({
    data: {
      name: 'Admin Standard',
      email: 'admin_kecil@rental.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      accountType: 'standard',
    },
  });

  const adminPremium = await prisma.user.create({
    data: {
      name: 'Admin Premium',
      email: 'admin_premium@rental.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      accountType: 'premium',
    },
  });

  // Keep original admin for backward compatibility
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@rental.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      accountType: 'premium',
    },
  });

  // Create customer users
  const customers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Budi Santoso',
        email: 'budi@email.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Siti Rahayu',
        email: 'siti@email.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ahmad Wijaya',
        email: 'ahmad@email.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
      },
    }),
  ]);

  console.log('Created users');

  // Create vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        plateNumber: 'B 1234 ABC',
        model: 'Avanza',
        brand: 'Toyota',
        year: 2022,
        color: 'Silver',
        status: 'rented',
        dailyRate: 350000,
        latitude: sampleLocations[0].lat,
        longitude: sampleLocations[0].lng,
        lastLocationAt: new Date(),
        imageUrl: '/vehicles/avanza.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'B 5678 DEF',
        model: 'Innova',
        brand: 'Toyota',
        year: 2023,
        color: 'Black',
        status: 'available',
        dailyRate: 500000,
        latitude: sampleLocations[1].lat,
        longitude: sampleLocations[1].lng,
        lastLocationAt: new Date(),
        imageUrl: '/vehicles/innova.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'B 9012 GHI',
        model: 'Xenia',
        brand: 'Daihatsu',
        year: 2021,
        color: 'White',
        status: 'rented',
        dailyRate: 300000,
        latitude: sampleLocations[2].lat,
        longitude: sampleLocations[2].lng,
        lastLocationAt: new Date(),
        imageUrl: '/vehicles/xenia.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'B 3456 JKL',
        model: 'Pajero',
        brand: 'Mitsubishi',
        year: 2023,
        color: 'Gray',
        status: 'available',
        dailyRate: 850000,
        latitude: sampleLocations[3].lat,
        longitude: sampleLocations[3].lng,
        lastLocationAt: new Date(),
        imageUrl: '/vehicles/pajero.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'B 7890 MNO',
        model: 'Fortuner',
        brand: 'Toyota',
        year: 2022,
        color: 'White',
        status: 'maintenance',
        dailyRate: 750000,
        latitude: sampleLocations[4].lat,
        longitude: sampleLocations[4].lng,
        lastLocationAt: new Date(),
        imageUrl: '/vehicles/fortuner.png',
      },
    }),
  ]);

  console.log('Created vehicles');

  // Create geofences
  const geofences = await Promise.all([
    prisma.geofence.create({
      data: {
        name: 'Jakarta CBD Zone',
        description: 'Area pusat bisnis Jakarta - zona aman',
        coordinates: jakartaCbdPolygon,
        isActive: true,
        color: '#22c55e',
        type: 'safe',
        alertOnEntry: false,
        alertOnExit: true,
      },
    }),
    prisma.geofence.create({
      data: {
        name: 'South Jakarta Area',
        description: 'Area Jakarta Selatan',
        coordinates: southJakartaPolygon,
        isActive: true,
        color: '#3b82f6',
        type: 'safe',
        alertOnEntry: false,
        alertOnExit: true,
      },
    }),
    prisma.geofence.create({
      data: {
        name: 'Airport Restricted Zone',
        description: 'Area bandara - perlu izin khusus',
        coordinates: airportPolygon,
        isActive: true,
        color: '#ef4444',
        type: 'restricted',
        alertOnEntry: true,
        alertOnExit: false,
      },
    }),
  ]);

  console.log('Created geofences');

  // Create tracking logs (historical data)
  const now = new Date();
  const trackingPromises: Promise<unknown>[] = [];

  for (const vehicle of vehicles) {
    // Create 24 hours of tracking data (every 15 minutes = 96 points)
    for (let i = 0; i < 96; i++) {
      const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);
      
      // Random movement simulation
      const baseLat = vehicle.latitude || -6.2088;
      const baseLng = vehicle.longitude || 106.8456;
      const latOffset = (Math.random() - 0.5) * 0.01;
      const lngOffset = (Math.random() - 0.5) * 0.01;

      trackingPromises.push(
        prisma.trackingLog.create({
          data: {
            vehicleId: vehicle.id,
            latitude: baseLat + latOffset * (1 - i / 96),
            longitude: baseLng + lngOffset * (1 - i / 96),
            speed: Math.random() * 80 + 10,
            heading: Math.random() * 360,
            recordedAt: timestamp,
            ignition: Math.random() > 0.3,
            fuel: 100 - i * 0.5 + Math.random() * 10,
          },
        })
      );
    }
  }

  await Promise.all(trackingPromises);
  console.log('Created tracking logs');

  // Create active rentals
  await Promise.all([
    prisma.rental.create({
      data: {
        vehicleId: vehicles[0].id,
        userId: customers[0].id,
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        totalAmount: 5 * 350000,
        deposit: 500000,
        status: 'active',
        startOdometer: 45000,
        notes: 'Rental untuk perjalanan bisnis',
      },
    }),
    prisma.rental.create({
      data: {
        vehicleId: vehicles[2].id,
        userId: customers[1].id,
        startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        totalAmount: 5 * 300000,
        deposit: 400000,
        status: 'active',
        startOdometer: 32000,
      },
    }),
  ]);

  console.log('Created rentals');

  // Create sample geofence alerts
  await Promise.all([
    prisma.geofenceAlert.create({
      data: {
        geofenceId: geofences[0].id,
        vehicleId: vehicles[0].id,
        alertType: 'exit',
        message: 'Kendaraan B 1234 ABC keluar dari zona Jakarta CBD',
        locationLat: -6.1650,
        locationLng: 106.8150,
        isResolved: true,
        resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.geofenceAlert.create({
      data: {
        geofenceId: geofences[2].id,
        vehicleId: vehicles[2].id,
        alertType: 'entry',
        message: 'Kendaraan B 9012 GHI memasuki zona terlarang Airport',
        locationLat: -6.1250,
        locationLng: 106.6550,
        isResolved: false,
      },
    }),
  ]);

  console.log('Created geofence alerts');
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
