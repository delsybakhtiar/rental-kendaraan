Prompt 1: Perancangan Database PostGIS (Rental Mobil & Tracking)
Dokumen ini berisi struktur database yang dioptimalkan untuk fitur tracking dan geofencing.

1. Inisialisasi Database
Aktifkan ekstensi PostGIS untuk menangani data geografis:

```

CREATE EXTENSION IF NOT EXISTS postgis;

```

2. Struktur Tabel Utama
A. Tabel Users

Menyimpan data akun pelanggan dan admin.

```

CREATE TABLE users (

    id SERIAL PRIMARY KEY,

    name VARCHAR(100),

    email VARCHAR(100) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) DEFAULT 'customer', -- 'admin', 'customer'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

```

B. Tabel Vehicles

Menyimpan data unit mobil yang disewakan.

```

CREATE TABLE vehicles (

    id SERIAL PRIMARY KEY,

    plate_number VARCHAR(20) UNIQUE NOT NULL,

    model VARCHAR(50),

    brand VARCHAR(50),

    status VARCHAR(20) DEFAULT 'available', -- 'available', 'rented', 'maintenance'

    current_location GEOGRAPHY(POINT, 4326) -- Koordinat terakhir mobil

);

```

C. Tabel Tracking Logs (Data Historis)

Untuk melihat riwayat perjalanan mobil.

```

CREATE TABLE tracking_logs (

    id BIGSERIAL PRIMARY KEY,

    vehicle_id INT REFERENCES vehicles(id),

    location GEOGRAPHY(POINT, 4326) NOT NULL,

    speed FLOAT, -- Kecepatan dalam km/jam

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX idx_tracking_location ON tracking_logs USING GIST(location);

```

D. Tabel Geofences (Area Aman)

Menyimpan poligon zona yang diperbolehkan.

```

CREATE TABLE geofences (

    id SERIAL PRIMARY KEY,

    name VARCHAR(100),

    area GEOMETRY(POLYGON, 4326), -- Area batas dalam peta

    is_active BOOLEAN DEFAULT true

);

```

3. Keamanan Tingkat Database
• Gunakan Row Level Security (RLS) jika memungkinkan.

• Pastikan password menggunakan hashing (Bcrypt/Argon2) di level aplikasi, bukan plain text.
