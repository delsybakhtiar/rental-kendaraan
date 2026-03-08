Fase 2: Konfigurasi Environment & Keamanan API

Langkah ini bertujuan untuk menyembunyikan "kunci rumah" (password) dari publik dan mengamankan port yang terbuka.
1. Contoh File .env yang Aman

Buat file bernama .env di folder root project kamu (jangan di-upload ke GitHub).
Code snippet

# Server Config
PORT=3000
NODE_ENV=production

# Database (PostGIS)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=rental_db
DB_USER=delsy_admin
DB_PASS=GantiDenganPasswordKuat123!

# Security Keys
JWT_SECRET=MasukanStringRandomYangSangatPanjangDanRumit
AES_ENCRYPTION_KEY=KunciUntukEnkripsiDataSensitifKTP

# Integrasi Alert
WHATSAPP_API_KEY=KunciApiFonnteAtauTwilio

2. Cara Mengunci Port (Hardening)

Agar port database (5432) tidak bisa ditembus dari luar, jalankan perintah ini di terminal Linux kamu:
Bash

# Blokir akses luar ke database, hanya izinkan dari localhost
sudo ufw deny 5432/tcp
# Izinkan port web saja
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

3. Integrasi Logic Alert (Premium)

Di backend, gunakan variabel ini untuk mengecek koordinat:
JavaScript

if (distance > allowed_radius) {
  sendAlert(vehicle_id, "Keluar dari Zona Aman!");
}

🚀 Prompt untuk Z.Ai (Lanjutan):

Salin ini ke Z.Ai agar dia mengimplementasikan sistem .env dan pengamanan port:

    "Saya ingin mengamankan project ini lebih lanjut. Tolong lakukan hal berikut:

        Modifikasi kode Backend agar menggunakan dotenv untuk membaca konfigurasi dari file .env (terutama untuk koneksi database dan JWT Secret).

        Buat middleware AuthGuard yang memvalidasi JWT Token pada setiap request ke /api/tracking.

        Tambahkan fitur Rate Limiting menggunakan library express-rate-limit agar API tidak bisa di-spam.

        Pastikan response API tidak menampilkan informasi teknis server (gunakan helmet middleware).

        Update fitur Geofencing agar jika mobil keluar zona, sistem mencatat log alert ke tabel notifications."

🛡️ Kenapa ini penting buat Keamanan?

    JWT_SECRET: Jika hacker tidak tahu kunci ini, mereka tidak bisa memalsukan identitas untuk masuk ke sistem kamu.

    IP Masking: Dengan menggunakan DB_HOST=127.0.0.1, database kamu "bersembunyi" di dalam server dan tidak mau menerima tamu dari internet publik

