# Setup Vercel Blob untuk Upload Gambar

## Masalah
Setelah deploy ke Vercel, upload gambar tidak berfungsi karena Vercel Blob belum dikonfigurasi.

## Solusi: Setup Vercel Blob

### Langkah 1: Install Vercel CLI (jika belum)
```bash
npm install -g vercel
```

### Langkah 2: Login ke Vercel
```bash
vercel login
```

### Langkah 3: Setup Vercel Blob di Project
```bash
vercel blob
```

### Langkah 4: Set Environment Variable
Di dashboard Vercel (vercel.com):
1. Pilih project "Rental Kendaraan"
2. Go to Settings > Environment Variables
3. Add new variable:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: (dari output `vercel blob` command)
   - Environment: Production

### Langkah 5: Redeploy
```bash
vercel --prod
```

## Verifikasi Setup

Setelah setup, test upload gambar di admin dashboard. Jika masih error, check:

1. **Environment Variable**: Pastikan `BLOB_READ_WRITE_TOKEN` sudah diset di Vercel dashboard
2. **Redeploy**: Pastikan sudah redeploy setelah set environment variable
3. **Logs**: Check Vercel function logs untuk error details

## Alternative: Gunakan Cloudinary

Jika ingin menggunakan Cloudinary sebagai alternatif:

1. Buat akun di [Cloudinary](https://cloudinary.com)
2. Dapatkan Cloud Name, API Key, dan API Secret
3. Set environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Update upload route untuk menggunakan Cloudinary

## Testing

1. Buka admin dashboard
2. Klik "Tambah" kendaraan
3. Upload gambar
4. Pastikan gambar tersimpan dan tampil dengan benar

## Troubleshooting

### Error: "Vercel Blob tidak dikonfigurasi"
- Pastikan `BLOB_READ_WRITE_TOKEN` environment variable sudah diset
- Redeploy aplikasi setelah set environment variable

### Error: "Upload gagal"
- Check Vercel function logs
- Pastikan file size < 5MB
- Pastikan file type adalah image (JPEG, PNG, WebP, GIF)

### Gambar tidak tampil setelah upload
- Check apakah URL gambar accessible
- Pastikan Vercel Blob storage sudah aktif</content>
<parameter name="filePath">/home/delsy/Rental Kendaraan/VERCEL_BLOB_SETUP.md