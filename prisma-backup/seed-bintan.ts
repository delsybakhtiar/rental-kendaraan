import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================
// BINTAN ISLAND COORDINATES
// ============================================

// Bintan Island boundary - Polygon kasar yang menutupi seluruh pulau
// Koordinat disusun berlawanan arah jarum jam (CCW) untuk exterior ring
// Format: [longitude, latitude]
const bintanIslandPolygon = JSON.stringify([
  // Start from Northwest, go clockwise
  [104.10, 1.35],   // Northwest - Laut Cina Selatan
  [104.90, 1.35],   // Northeast - Laut Cina Selatan  
  [104.95, 1.10],   // East coast
  [104.90, 0.85],   // Southeast
  [104.70, 0.75],   // South - toward Batam
  [104.35, 0.75],   // Southwest
  [104.10, 0.95],   // West coast
  [104.10, 1.35],   // Close polygon - back to Northwest
]);

// Pelabuhan Roro Tanjung Uban - Port di utara Bintan
// Kapal ferry ke Batam dan Singapura dari sini
const tanjungUbanPortPolygon = JSON.stringify([
  [104.20, 1.10],   // Northwest
  [104.28, 1.10],   // Northeast
  [104.28, 1.05],   // Southeast
  [104.20, 1.05],   // Southwest
  [104.20, 1.10],   // Close polygon
]);

// Pelabuhan Sri Bintan Pura (Tanjung Pinang)
// International ferry terminal ke Singapura dan Malaysia
const sriBintanPuraPortPolygon = JSON.stringify([
  [104.42, 0.94],   // Northwest
  [104.50, 0.94],   // Northeast
  [104.50, 0.88],   // Southeast
  [104.42, 0.88],   // Southwest
  [104.42, 0.94],   // Close polygon
]);

// Bandara Raja Haji Fisabilillah - Optional airport watch zone
const bintanAirportPolygon = JSON.stringify([
  [104.50, 0.98],   // Northwest
  [104.56, 0.98],   // Northeast
  [104.56, 0.94],   // Southeast
  [104.50, 0.94],   // Southwest
  [104.50, 0.98],   // Close polygon
]);

// ============================================
// SAMPLE VEHICLE LOCATIONS IN BINTAN
// ============================================

const bintanLocations = [
  { lat: 1.05, lng: 104.35, label: 'Tanjung Pinang City Center' },
  { lat: 1.08, lng: 104.24, label: 'Tanjung Uban Area' },
  { lat: 0.95, lng: 104.46, label: 'Near Sri Bintan Pura Port' },
  { lat: 1.15, lng: 104.55, label: 'Bintan Utara' },
  { lat: 0.85, lng: 104.50, label: 'Bintan Selatan' },
];

async function main() {
  console.log('🌱 Seeding Bintan Island Geofencing System...\n');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.geofenceAlert.deleteMany();
  await prisma.trackingLog.deleteMany();
  await prisma.rental.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin123', salt);
  const customerPasswordHash = await bcrypt.hash('customer123', salt);

  // Create users
  console.log('👥 Creating users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Bintan Rental',
      email: 'admin@bintanrental.com',
      passwordHash: passwordHash,
      role: 'admin',
    },
  });

  const customers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Ahmad Bintan',
        email: 'ahmad@bintan.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Siti Tanjung',
        email: 'siti@bintan.com',
        passwordHash: customerPasswordHash,
        role: 'customer',
      },
    }),
  ]);

  console.log(`   ✅ Created ${1 + customers.length} users`);

  // Create vehicles (located in Bintan)
  console.log('🚗 Creating vehicles...');
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        plateNumber: 'BP 1234 AA',
        model: 'Avanza',
        brand: 'Toyota',
        year: 2023,
        color: 'Silver',
        status: 'rented',
        dailyRate: 400000,
        latitude: bintanLocations[0].lat,
        longitude: bintanLocations[0].lng,
        lastLocationAt: new Date(),
        engineEnabled: true,
        imageUrl: '/vehicles/avanza.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'BP 5678 BB',
        model: 'Innova',
        brand: 'Toyota',
        year: 2024,
        color: 'Black',
        status: 'rented',
        dailyRate: 550000,
        latitude: bintanLocations[1].lat,
        longitude: bintanLocations[1].lng,
        lastLocationAt: new Date(),
        engineEnabled: true,
        imageUrl: '/vehicles/innova.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'BP 9012 CC',
        model: 'Xenia',
        brand: 'Daihatsu',
        year: 2022,
        color: 'White',
        status: 'available',
        dailyRate: 350000,
        latitude: bintanLocations[2].lat,
        longitude: bintanLocations[2].lng,
        lastLocationAt: new Date(),
        engineEnabled: true,
        imageUrl: '/vehicles/xenia.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'BP 3456 DD',
        model: 'Pajero',
        brand: 'Mitsubishi',
        year: 2023,
        color: 'Gray',
        status: 'available',
        dailyRate: 900000,
        latitude: bintanLocations[3].lat,
        longitude: bintanLocations[3].lng,
        lastLocationAt: new Date(),
        engineEnabled: true,
        imageUrl: '/vehicles/pajero.png',
      },
    }),
    prisma.vehicle.create({
      data: {
        plateNumber: 'BP 7890 EE',
        model: 'Fortuner',
        brand: 'Toyota',
        year: 2024,
        color: 'White',
        status: 'maintenance',
        dailyRate: 800000,
        latitude: bintanLocations[4].lat,
        longitude: bintanLocations[4].lng,
        lastLocationAt: new Date(),
        engineEnabled: true,
        imageUrl: '/vehicles/fortuner.png',
      },
    }),
  ]);

  console.log(`   ✅ Created ${vehicles.length} vehicles`);

  // Create geofences
  console.log('🗺️  Creating geofences...');
  
  // 1. Bintan Island Boundary - Main safe zone
  const bintanGeofence = await prisma.geofence.create({
    data: {
      name: 'Bintan Island Boundary',
      description: 'Batas wilayah aman - Seluruh Pulau Bintan. ALERT TINGGI jika kendaraan keluar dari area ini!',
      coordinates: bintanIslandPolygon,
      isActive: true,
      color: '#22c55e',
      type: 'island_boundary',
      alertOnEntry: false,
      alertOnExit: true,
      alertLevel: 'critical',
    },
  });

  // 2. Pelabuhan Roro Tanjung Uban - Port Watch
  const tanjungUbanGeofence = await prisma.geofence.create({
    data: {
      name: 'Port Watch - Tanjung Uban',
      description: 'Pelabuhan Roro Tanjung Uban. Alert jika kendaraan diam lebih dari 30 menit - indikasi akan menyeberang.',
      coordinates: tanjungUbanPortPolygon,
      isActive: true,
      color: '#f59e0b',
      type: 'port_watch',
      alertOnEntry: true,
      alertOnExit: false,
      alertLevel: 'high',
      stationaryThresholdMinutes: 30,
    },
  });

  // 3. Pelabuhan Sri Bintan Pura - Port Watch
  const sriBintanPuraGeofence = await prisma.geofence.create({
    data: {
      name: 'Port Watch - Sri Bintan Pura',
      description: 'Pelabuhan Sri Bintan Pura (Tanjung Pinang). Alert jika kendaraan diam lebih dari 30 menit.',
      coordinates: sriBintanPuraPortPolygon,
      isActive: true,
      color: '#f59e0b',
      type: 'port_watch',
      alertOnEntry: true,
      alertOnExit: false,
      alertLevel: 'high',
      stationaryThresholdMinutes: 30,
    },
  });

  // 4. Bintan Airport - Optional watch zone
  const airportGeofence = await prisma.geofence.create({
    data: {
      name: 'Bintan Airport Zone',
      description: 'Bandara Raja Haji Fisabilillah - Area bandara untuk monitoring.',
      coordinates: bintanAirportPolygon,
      isActive: true,
      color: '#3b82f6',
      type: 'safe',
      alertOnEntry: false,
      alertOnExit: true,
      alertLevel: 'medium',
    },
  });

  console.log(`   ✅ Created 4 geofences`);
  console.log(`      🏝️  Bintan Island Boundary (critical alert on exit)`);
  console.log(`      🚢 Tanjung Uban Port Watch (high alert on stationary)`);
  console.log(`      🚢 Sri Bintan Pura Port Watch (high alert on stationary)`);
  console.log(`      ✈️  Bintan Airport Zone (medium alert on exit)`);

  // Create active rentals
  console.log('📝 Creating rentals...');
  await Promise.all([
    prisma.rental.create({
      data: {
        vehicleId: vehicles[0].id,
        userId: customers[0].id,
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        totalAmount: 7 * 400000,
        deposit: 500000,
        status: 'active',
        startOdometer: 15000,
        notes: 'Sewa untuk perjalanan bisnis di Bintan',
      },
    }),
    prisma.rental.create({
      data: {
        vehicleId: vehicles[1].id,
        userId: customers[1].id,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        totalAmount: 4 * 550000,
        deposit: 600000,
        status: 'active',
        startOdometer: 28000,
        notes: 'Sewa untuk wisata keluarga',
      },
    }),
  ]);

  console.log(`   ✅ Created 2 active rentals`);

  // Create some sample tracking logs
  console.log('📍 Creating sample tracking logs...');
  const now = new Date();
  const trackingPromises: Promise<unknown>[] = [];

  for (const vehicle of vehicles) {
    // Create 24 hours of tracking data (every 15 minutes = 96 points)
    for (let i = 0; i < 96; i++) {
      const timestamp = new Date(now.getTime() - i * 15 * 60 * 1000);
      
      const baseLat = vehicle.latitude || 1.0;
      const baseLng = vehicle.longitude || 104.5;
      const latOffset = (Math.random() - 0.5) * 0.02;
      const lngOffset = (Math.random() - 0.5) * 0.02;

      trackingPromises.push(
        prisma.trackingLog.create({
          data: {
            vehicleId: vehicle.id,
            latitude: baseLat + latOffset,
            longitude: baseLng + lngOffset,
            speed: Math.random() * 60 + 10,
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
  console.log(`   ✅ Created ${vehicles.length * 96} tracking logs`);

  // Create sample alerts for demonstration
  console.log('⚠️  Creating sample alerts...');
  
  // Sample critical alert - vehicle near island boundary
  await prisma.geofenceAlert.create({
    data: {
      geofenceId: bintanGeofence.id,
      vehicleId: vehicles[0].id,
      alertType: 'exit',
      alertLevel: 'critical',
      message: '🚨 KRITIS: Kendaraan BP 1234 AA terdeteksi keluar dari Pulau Bintan! Kemungkinan sedang menyeberang ke Batam/Singapura.',
      locationLat: 0.82,
      locationLng: 104.40,
      isResolved: false,
    },
  });

  // Sample high alert - stationary at port
  await prisma.geofenceAlert.create({
    data: {
      geofenceId: tanjungUbanGeofence.id,
      vehicleId: vehicles[1].id,
      alertType: 'stationary',
      alertLevel: 'high',
      message: '⚠️ TINGGI: Kendaraan BP 5678 BB diam selama 45 menit di Pelabuhan Tanjung Uban. Indikasi akan menyeberang.',
      locationLat: 1.07,
      locationLng: 104.24,
      isResolved: false,
    },
  });

  // Sample resolved alert
  await prisma.geofenceAlert.create({
    data: {
      geofenceId: sriBintanPuraGeofence.id,
      vehicleId: vehicles[2].id,
      alertType: 'stationary',
      alertLevel: 'medium',
      message: 'Kendaraan BP 9012 CC diam di Pelabuhan Sri Bintan Pura.',
      locationLat: 0.91,
      locationLng: 104.46,
      isResolved: true,
      resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  });

  console.log(`   ✅ Created 3 sample alerts`);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 BINTAN ISLAND GEOFENCING SYSTEM SEEDED SUCCESSFULLY!');
  console.log('='.repeat(60));
  
  console.log('\n📊 Summary:');
  console.log(`   Users: ${1 + customers.length} (1 admin, ${customers.length} customers)`);
  console.log(`   Vehicles: ${vehicles.length} (all in Bintan Island)`);
  console.log(`   Geofences: 4`);
  console.log(`   Active Rentals: 2`);
  console.log(`   Active Alerts: 2 (1 critical, 1 high)`);

  console.log('\n🔐 Test Credentials:');
  console.log('   Admin: admin@bintanrental.com / admin123');
  console.log('   Customer: ahmad@bintan.com / customer123');

  console.log('\n🗺️  Geofence Zones:');
  console.log('   🏝️  Bintan Island Boundary');
  console.log('       Type: island_boundary | Alert Level: CRITICAL');
  console.log('       Alert on EXIT - Vehicle leaving Bintan Island');
  console.log('');
  console.log('   🚢 Port Watch - Tanjung Uban');
  console.log('       Type: port_watch | Alert Level: HIGH');
  console.log('       Alert on STATIONARY > 30 minutes');
  console.log('');
  console.log('   🚢 Port Watch - Sri Bintan Pura');
  console.log('       Type: port_watch | Alert Level: HIGH');
  console.log('       Alert on STATIONARY > 30 minutes');
  console.log('');
  console.log('   ✈️  Bintan Airport Zone');
  console.log('       Type: safe | Alert Level: MEDIUM');
  console.log('       Alert on EXIT');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
