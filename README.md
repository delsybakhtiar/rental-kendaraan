# Bintan Island Car Rental & GPS Tracking System

Sistem rental mobil dengan fitur GPS Tracking, Geofencing, dan Engine Kill Remote.

## 🚀 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Database**: SQLite dengan Prisma ORM
- **Maps**: Leaflet, React-Leaflet
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Struktur Folder

```
src/
├── app/
│   ├── page.tsx                    # Redirect ke /admin/login
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   │
│   ├── katalog/
│   │   └── page.tsx                # Halaman katalog publik
│   │
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx            # Halaman login admin
│   │   └── dashboard/
│   │       └── page.tsx            # Dashboard admin (Standard/Premium)
│   │
│   └── api/                        # API Routes
│       ├── auth/
│       │   ├── login/route.ts      # Login API
│       │   ├── register/route.ts   # Register API
│       │   └── me/route.ts         # Get current user
│       ├── vehicles/               # Vehicle CRUD + Engine Kill
│       ├── bookings/               # Booking management
│       ├── geofences/              # Geofence management
│       ├── tracking/               # GPS tracking
│       ├── alerts/                 # Alert notifications
│       ├── dashboard/route.ts      # Dashboard stats
│       └── seed/route.ts           # Demo user seeder
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── dashboard/                  # Dashboard components
│   ├── vehicles/                   # Vehicle list component
│   ├── map/                        # Leaflet map component
│   ├── geofences/                  # Geofence components
│   ├── tracking/                   # Tracking history
│   └── bookings/                   # Booking panel
│
├── hooks/                          # React hooks
├── lib/                            # Utilities
├── types/                          # TypeScript types
└── contexts/                       # React contexts
```

## 🛠️ Installation (Local PC)

### 1. Prerequisites

- Node.js >= 20.0.0
- npm atau bun

### 2. Clone & Install

```bash
# Clone project
git clone <repository-url>
cd bintan-island-rental

# Install dependencies
npm install
# atau
bun install
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# (Optional) Buka Prisma Studio
npm run db:studio
```

### 4. Environment Variables

Buat file `.env` di root folder:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
```

### 5. Run Development Server

```bash
npm run dev
# atau
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 👤 Demo Accounts

| Account Type | Email | Password |
|-------------|-------|----------|
| Standard | admin_kecil@rental.com | admin123 |
| Premium | admin_premium@rental.com | admin123 |

## 🔐 Account Tiering

### Standard Account
- ✅ Vehicle List management
- ✅ Revenue Statistics
- ✅ Order/Pending Bookings Management
- ✅ Basic stats cards

### Premium Account
- ✅ All Standard features plus:
- ✅ Real-time GPS Tracking Map
- ✅ Geofencing Alerts
- ✅ Island Exit Notifications
- ✅ Engine Kill Remote Control
- ✅ Port Watch Monitoring
- ✅ Tracking History Timeline

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
```

## 🗺️ Features

### Public Features
- **Katalog Mobil**: Lihat daftar kendaraan tersedia
- **Booking System**: Pesan mobil dengan pilihan lepas kunci / dengan sopir
- **QRIS Payment**: Halaman pembayaran dengan timer 30 menit
- **WhatsApp Integration**: Reschedule & cancel via WhatsApp

### Admin Features (Standard)
- Dashboard statistik pendapatan
- Manajemen kendaraan
- Manajemen pesanan pending
- Konfirmasi pembayaran

### Admin Features (Premium)
- GPS Tracking real-time
- Geofencing alerts
- Notifikasi kendaraan keluar pulau
- Engine kill remote
- Port watch monitoring
- Tracking history

## 📱 Routes

| Route | Description |
|-------|-------------|
| `/` | Redirect ke `/admin/login` |
| `/katalog` | Katalog mobil publik |
| `/admin/login` | Login admin |
| `/admin/dashboard` | Dashboard admin |

## 🔧 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create vehicle
- `GET /api/vehicles/:id` - Get vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `POST /api/vehicles/:id/engine` - Engine kill
- `PUT /api/vehicles/:id/engine` - Engine restore

### Bookings
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking

### Dashboard
- `GET /api/dashboard` - Dashboard stats

### Alerts
- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/resolve` - Resolve alert

## 📄 License

MIT License
