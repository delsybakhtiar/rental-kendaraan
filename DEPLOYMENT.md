# Deployment Checklist

Dokumen ini untuk deploy production aplikasi di repo ini, sesuai konfigurasi yang sekarang aktif.

## Ringkasan

- Runtime: Node.js 20+
- Framework: Next.js 16 App Router
- Database: PostgreSQL via Prisma
- File upload: Vercel Blob
- Start command production: `npm run start`
- Health endpoint: `GET /api/health`

## Environment Variables

Minimal env yang wajib ada:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
JWT_SECRET=change-this-to-a-random-secret-with-at-least-32-characters
```

Wajib jika fitur upload gambar kendaraan dipakai:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token
```

Opsional:

```env
PORT=3000
NODE_ENV=production
GPS_DEVICE_SHARED_SECRET=shared_secret_for_signed_gps_device_requests
GPS_INTEGRATION_MODE=production
GPS_DEMO_TOKEN=demo_mode_token_for_simulator_requests
TRACKING_SERVICE_URL=https://internal-tracking-service.example.com
TRACKING_SYNC_TIMEOUT_MS=5000
TRACKING_SYNC_MAX_ATTEMPTS=5
TRACKING_RECONCILE_SECRET=set_a_long_random_secret_for_scheduler_calls
```

Catatan:

- `JWT_SECRET` saat ini dipakai untuk semua admin token. Jangan deploy dengan nilai default.
- Jika `BLOB_READ_WRITE_TOKEN` tidak diisi, upload gambar kendaraan akan gagal dengan error server-side yang sudah ditangani.
- `TRACKING_RECONCILE_SECRET` dipakai untuk menjalankan reconciliation sync GPS dari scheduler tanpa login admin manual.
- `GPS_INTEGRATION_MODE` menentukan route ingest GPS yang aktif: `demo` atau `production`.
- `GPS_DEMO_TOKEN` hanya dipakai jika mode `demo` aktif dan simulator tidak memakai login admin.

## Pre-Deploy

Jalankan ini di CI atau sebelum release:

```bash
npm install
npm run lint
./node_modules/.bin/tsc --noEmit
npm run test:e2e
npm run build
```

Untuk GPS ingest, gate yang lebih realistis:

```bash
npm run test:gps:contracts
PLAYWRIGHT_GPS_DB=1 npm run test:gps:db
```

## Database

Generate Prisma client:

```bash
npm run db:generate
```

Untuk production migration, pakai:

```bash
npm run db:migrate:deploy
```

Jangan pakai `npm run db:migrate` di production karena itu mode development.

## Build dan Start

Build:

```bash
npm run build
```

Start server production:

```bash
npm run start
```

Repo ini memakai `output: "standalone"`, jadi `npm run start` sudah diarahkan ke `.next/standalone/server.js`.

## Smoke Check Setelah Deploy

1. Cek health endpoint:

```bash
curl -fsS https://YOUR_DOMAIN/api/health
```

2. Pastikan response `status` adalah `healthy` atau `degraded`.

3. Cek login admin:

- buka `/admin/login`
- login dengan akun admin valid
- pastikan redirect ke `/admin/dashboard`

4. Cek katalog publik:

- buka `/katalog`
- pastikan daftar kendaraan tampil
- pastikan booking modal bisa dibuka

5. Cek upload kendaraan:

- login admin
- tambah kendaraan dengan gambar
- pastikan upload berhasil dan gambar tersimpan

6. Cek route admin sensitif:

- tanpa token, `GET /api/vehicles/:id` harus ditolak
- tanpa token, `POST /api/vehicles/:id/rent` harus ditolak

7. Cek backlog sync GPS:

```bash
curl -fsS https://YOUR_DOMAIN/api/health
```

Pastikan `checks.trackingSync` tidak menunjukkan backlog `exhausted`.

8. Jalankan reconciliation terjadwal:

```bash
curl -X POST "https://YOUR_DOMAIN/api/tracking/reconcile?limit=25" \
  -H "x-reconcile-secret: YOUR_TRACKING_RECONCILE_SECRET"
```

Rekomendasi: panggil setiap 1-5 menit dari scheduler platform deploy.

## Monitoring Minimum

Pantau minimal:

- `GET /api/health`
- error rate API `5xx`
- koneksi database PostgreSQL
- kegagalan upload Blob
- penggunaan memory process Node
- backlog `trackingSync` pada `/api/health`

## Risiko yang Masih Perlu Diingat

- Sebagian E2E masih memakai mock API, jadi belum menggantikan smoke test terhadap database nyata.
- Route tracking memakai `TRACKING_SERVICE_URL`. Pastikan mengarah ke service internal yang benar di production.
- Reconciliation GPS saat ini scheduler-driven, bukan worker internal yang selalu aktif. Jika scheduler mati, backlog sync akan menumpuk.
- Seed route sudah dimatikan di production, jadi akun admin production harus disediakan lewat migration/seed internal yang terkontrol.
