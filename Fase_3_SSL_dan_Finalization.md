Fase 3: Enkripsi SSL & Persiapan Production

Tahap akhir untuk membuat website kamu profesional dan aman dari penyadapan data.
1. Implementasi SSL (Let's Encrypt)

Gunakan Certbot untuk mendapatkan sertifikat gratis yang diakui dunia.

    Port 80: Untuk verifikasi.

    Port 443: Untuk jalur data aman (HTTPS).

2. Hardening Nginx (Reverse Proxy)

Konfigurasi agar semua traffic HTTP (biasa) otomatis dipaksa masuk ke HTTPS (aman).
Nginx

server {
    listen 80;
    server_name domainkamu.com;
    return 301 https://$server_name$request_uri;
}

3. Final Security Check

    Nonaktifkan console.log di production agar tidak membocorkan alur logika.

    Hapus port-port yang tidak digunakan di firewall.

🚀 Prompt untuk Z.Ai (Tahap Terakhir):

Gunakan ini jika kamu ingin membereskan bagian koneksi amannya:

    "Project ini hampir selesai. Sekarang bantu saya di bagian Deployment & SSL:

        Buat konfigurasi Nginx Reverse Proxy yang mengarahkan traffic dari port 80/443 ke aplikasi Node.js saya di port 3000.

        Berikan langkah-langkah menginstal Certbot (Let's Encrypt) di Ubuntu untuk domain saya.

        Pastikan semua cookies dan session menggunakan flag Secure dan HttpOnly agar tidak bisa dicuri lewat script jahat (XSS).

        Tambahkan script 'Health Check' sederhana di backend untuk memantau apakah server masih hidup atau sedang down."
