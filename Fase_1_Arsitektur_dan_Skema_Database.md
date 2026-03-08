Fase 1: Arsitektur & Skema Database
1. Tech Stack Utama
• Backend: Node.js (NestJS) - Performa tinggi untuk real-time.

• Database: PostgreSQL + PostGIS - Untuk penyimpanan data spasial (koordinat & geofence).

• Caching: Redis - Untuk tracking posisi mobil secara real-time.

• Map Engine: Mapbox atau Google Maps API.

2. Struktur Folder Proyek
```

~/Rental Kendaraan/

├── apps/

│   ├── backend/          # API & Business Logic

│   └── tracking-engine/  # Microservice khusus koordinat & alert

├── docs/                 # Dokumentasi & MD Files

├── infra/                # Docker & Nginx Config

└── schema/               # Database migrations

```

3. Skema Database (PostgreSQL)
Tabel utama yang dibutuhkan:

• `users`: ID, nama, role, password_hash.

• `vehicles`: ID, plat_nomor, status_sewa, device_id.

• `tracking_logs`: vehicle_id, koordinat (geography), timestamp.

• `geofence_zones`: ID, nama_zona, polygon_area (geometry), status_alert.

4. Keamanan API Awal
• Implementasi Helmet.js untuk security headers.

• CORS policy yang diperketat.

• JWT dengan RSA256.
