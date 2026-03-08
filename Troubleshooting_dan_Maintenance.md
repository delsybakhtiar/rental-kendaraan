Panduan Problem Solving & Maintenance - Rental Mobil

Dokumen ini adalah panduan cepat jika terjadi error atau kendala pada sistem tracking dan keamanan.
1. Penanganan Error Frontend (React/Next.js)

Masalah paling umum adalah data yang "kosong" saat dipanggil.

    Gejala: Layar putih atau pesan Cannot read property '...' of undefined.

    Solusi: Selalu gunakan Optional Chaining (?.) dan Nullish Coalescing (??).

        Buruk: vehicle.dailyRate.toLocaleString()

        Aman: vehicle.dailyRate?.toLocaleString() ?? "0"

    Cek Koneksi: Pastikan API Backend menyala sebelum membuka Frontend.

2. Kendala Real-time Tracking & GPS

Jika posisi mobil di peta tidak bergerak:

    Cek Database: Pastikan data masuk ke tabel tracking_logs. Jalankan query:
    SQL

    SELECT * FROM tracking_logs ORDER BY recorded_at DESC LIMIT 5;

    Cek PostGIS: Pastikan fungsi geospasial bekerja. Jika koordinat tertukar (Lintang/Bujur), peta akan menampilkan mobil di tengah laut.

    Latency: Jika tracking lambat, cek koneksi WebSocket atau Redis cache kamu.

3. Masalah Keamanan & API

Jika API tidak bisa diakses atau ditolak:

    Error 401 (Unauthorized): Token JWT kamu mungkin kadaluwarsa. Silakan Login ulang.

    Error 429 (Too Many Requests): Rate Limiter aktif. Tunggu beberapa menit sebelum mencoba lagi. Ini tandanya fitur keamanan kamu bekerja dengan baik.

    Port Tertutup: Jika Backend tidak bisa dihubungi sama sekali, cek status Firewall (UFW) di server:
    Bash

    sudo ufw status

4. Jadwal Maintenance Rutin (Penting!)

Agar website tidak mudah dijebol dalam jangka panjang:

    Update Library: Jalankan npm update sebulan sekali untuk menutup celah keamanan pada dependency.

    Rotasi Secret Key: Ganti JWT_SECRET di file .env setiap 3-6 bulan.

    Audit Log: Cek log akses Nginx untuk melihat apakah ada IP mencurigakan yang mencoba melakukan scanning port.
