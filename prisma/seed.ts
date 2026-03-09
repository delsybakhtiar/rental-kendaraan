import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // ============================================
  // 1. Create Users
  // ============================================
  console.log('Creating users...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@rental.com' },
    update: {},
    create: {
      name: 'Admin Utama',
      email: 'admin@rental.com',
      passwordHash: hashedPassword,
      role: 'admin',
      accountType: 'premium',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin_kecil@rental.com' },
    update: {},
    create: {
      name: 'Admin Standard',
      email: 'admin_kecil@rental.com',
      passwordHash: hashedPassword,
      role: 'admin',
      accountType: 'standard',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin_premium@rental.com' },
    update: {},
    create: {
      name: 'Admin Premium',
      email: 'admin_premium@rental.com',
      passwordHash: hashedPassword,
      role: 'admin',
      accountType: 'premium',
    },
  });

  console.log('Created 3 users');

  // ============================================
  // 2. Create Vehicles
  // ============================================
  console.log('Creating vehicles...');

  await prisma.vehicle.upsert({
    where: { plateNumber: 'BP 1234 AA' },
    update: {},
    create: {
      plateNumber: 'BP 1234 AA',
      brand: 'Toyota',
      model: 'Avanza',
      year: 2022,
      color: 'Silver',
      status: 'available',
      dailyRate: 350000,
      latitude: 1.0891,
      longitude: 104.4833,
      lastLocationAt: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400',
    },
  });

  await prisma.vehicle.upsert({
    where: { plateNumber: 'BP 5678 CD' },
    update: {},
    create: {
      plateNumber: 'BP 5678 CD',
      brand: 'Suzuki',
      model: 'Ertiga',
      year: 2023,
      color: 'Putih',
      status: 'available',
      dailyRate: 400000,
      latitude: 1.0644,
      longitude: 104.4518,
      lastLocationAt: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400',
    },
  });

  await prisma.vehicle.upsert({
    where: { plateNumber: 'BP 9012 EF' },
    update: {},
    create: {
      plateNumber: 'BP 9012 EF',
      brand: 'Honda',
      model: 'Jazz',
      year: 2021,
      color: 'Merah',
      status: 'available',
      dailyRate: 300000,
      latitude: 1.1032,
      longitude: 104.5123,
      lastLocationAt: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400',
    },
  });

  await prisma.vehicle.upsert({
    where: { plateNumber: 'BP 3456 GH' },
    update: {},
    create: {
      plateNumber: 'BP 3456 GH',
      brand: 'Mitsubishi',
      model: 'Xpander',
      year: 2023,
      color: 'Hitam',
      status: 'available',
      dailyRate: 450000,
      latitude: 1.0522,
      longitude: 104.4234,
      lastLocationAt: new Date(),
      imageUrl: 'https://images.unsplash.com/photo-1606611013016-969c19ba27bb?w=400',
    },
  });

  console.log('Created 4 vehicles');

  // ============================================
  // 3. Create Geofences
  // ============================================
  console.log('Creating geofences...');

  const bintanCoords = JSON.stringify([
    [104.35, 0.85],
    [104.90, 0.85],
    [104.95, 1.10],
    [104.85, 1.30],
    [104.50, 1.35],
    [104.20, 1.20],
    [104.10, 0.95],
    [104.20, 0.80],
    [104.35, 0.85],
  ]);

  await prisma.geofence.upsert({
    where: { id: 'bintan-island' },
    update: {},
    create: {
      id: 'bintan-island',
      name: 'Bintan Island Safe Zone',
      description: 'Area aman utama Pulau Bintan',
      coordinates: bintanCoords,
      type: 'island_boundary',
      color: '#22c55e',
      alertOnEntry: false,
      alertOnExit: true,
      alertLevel: 'critical',
    },
  });

  await prisma.geofence.upsert({
    where: { id: 'bandar-bentan' },
    update: {},
    create: {
      id: 'bandar-bentan',
      name: 'Bandar Bentan Telani Port',
      description: 'Area pelabuhan untuk monitoring',
      coordinates: JSON.stringify([
        [104.47, 1.08],
        [104.49, 1.08],
        [104.49, 1.10],
        [104.47, 1.10],
        [104.47, 1.08],
      ]),
      type: 'port_watch',
      color: '#f59e0b',
      alertOnEntry: true,
      alertOnExit: true,
      alertLevel: 'high',
      stationaryThresholdMinutes: 30,
    },
  });

  console.log('Created 2 geofences');

  console.log('');
  console.log('========================================');
  console.log('✅ Seeding completed successfully!');
  console.log('========================================');
  console.log('');
  console.log('📋 Demo Accounts:');
  console.log('   Standard: admin_kecil@rental.com / admin123');
  console.log('   Premium:  admin_premium@rental.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });