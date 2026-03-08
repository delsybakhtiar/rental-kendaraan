Prompt 2: Backend Setup & API Hardening
Tujuannya adalah membangun gerbang API yang aman agar port tidak mudah dipindai (scanning) dan data tidak bocor.

1. Setup Environment (Security First)
Gunakan `.env` untuk menyembunyikan kredensial database.

```

DB_HOST=localhost

DB_PORT=5432

DB_USER=delsy_admin

DB_PASS=SangatRahasia123!

JWT_SECRET=GunakanRandomStringPanjang

```

2. Proteksi Port & Koneksi
• Backend Framework: NestJS atau Express.

• Port Masking: Jalankan aplikasi di port non-standar (misal: 8080) dan gunakan Nginx sebagai Reverse Proxy di port 443 (HTTPS).

• Helmet.js: Wajib dipasang untuk menyembunyikan header `X-Powered-By` agar hacker tidak tahu kita pakai Node.js.

3. Rate Limiting Logic
Mencegah serangan brute force pada API tracking.

```

// Contoh logic sederhana

import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({ tokensPerInterval: 10, interval: "second" });

```

4. Struktur Folder API
```

backend/

├── src/

│   ├── auth/           # Login & Register (JWT)

│   ├── tracking/       # GPS Data Handler

│   ├── vehicles/       # CRUD Mobil (Termasuk dailyRate)

│   └── middleware/     # Security Check (Header validation)

```
