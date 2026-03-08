Fase 2: Pengamanan API & Real-time Tracking Engine

Dokumen ini fokus pada pengamanan "pintu masuk" aplikasi agar port dan data tidak mudah dieksploitasi.
1. Proteksi Layer API (Anti-Jebol)

Agar API tidak bisa ditembak langsung oleh script atau orang asing:

    JWT Hardening: Gunakan Secret Key yang panjang di .env. Token harus dikirim via Header Authorization: Bearer <token>.

    Rate Limiting: Batasi IP yang sama agar tidak bisa melakukan request lebih dari 60 kali per menit (mencegah DDoS/Brute Force).

    Helmet.js: Mengamankan HTTP headers untuk mencegah Clickjacking dan MIME sniffing.

2. Fitur Premium: Real-time Alert

Logika yang berjalan di background saat koordinat GPS masuk:

    Geofence Check: Membandingkan posisi terakhir dengan poligon zona aman.

    Status Alert: Jika is_inside_safe_zone adalah false, sistem langsung menandai kendaraan tersebut di dashboard dengan warna merah.

3. Struktur Folder Terupdate
Plaintext

backend/
├── .env                # Kunci rahasia (JANGAN DI-COMMIT)
├── src/
│   ├── middleware/
│   │   ├── auth.ts      # Validasi Token JWT
│   │   └── limit.ts     # Proteksi Rate Limiting
│   ├── services/
│   │   └── tracking.ts  # Logika Geofence & Alert
│   └── routes/
│       └── api.ts       # Endpoint yang sudah terproteksi

🚀 Prompt Lanjutan untuk Z.Ai (Tahap 2 - Security Focus)

Gunakan prompt ini agar Z.Ai mengunci sistem yang sudah dia buat:

    "Sistem tracking sudah berjalan, sekarang bantu saya memperkuat keamanannya (Security Hardening) pada Backend:

        Implementasikan JWT Authentication pada semua route /api/tracking/*. Pastikan user harus login dulu sebelum bisa melihat posisi mobil.

        Pasang express-rate-limit untuk mencegah brute force.

        Pastikan port database tidak terekspos langsung; buatkan file .env untuk menyimpan konfigurasi DB_URL dan JWT_SECRET.

        Pada logika Geofencing yang tadi (Jakarta CBD Zone), tambahkan fungsi untuk mengirimkan 'Alert Message' ke kolom alerts di dashboard jika mobil keluar zona.

        Perbaiki variabel dailyRate di API agar selalu mengirimkan angka (number) untuk mencegah error undefined di frontend."

🛡️ Catatan Keamanan Port

Karena kamu menyebutkan soal Port yang terexpose, pastikan di terminal Linux kamu (delsy@delsy-Aspire-4752), kamu sudah mengaktifkan Firewall dasar.

Tips: Jalankan perintah ini di terminalmu untuk memastikan hanya port web yang terbuka:
Bash

sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Port untuk aplikasi (sesuaikan)
sudo ufw enable
