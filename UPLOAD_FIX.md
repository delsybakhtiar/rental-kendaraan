# Upload File Gambar - Perbaikan Issue

## Masalah yang Ditemukan

1. **Backend Upload Route** (`/src/app/api/upload/route.ts`):
   - Mengharapkan `filename` dari query params, tetapi frontend mengirim FormData tanpa query params
   - Tidak handle FormData dengan benar
   - Response tidak sesuai format yang diharapkan frontend (`success` dan `imageUrl` fields)

2. **Frontend Upload Handler** (`/src/app/admin/dashboard/page.tsx`):
   - Mengirim FormData tanpa filename parameter
   - Mengharapkan `data.success` dan `data.imageUrl` dari response

3. **Image Display Error Handling**:
   - Tidak ada fallback icon ketika image gagal load

4. **Image Cropping Issue**:
   - Gambar kendaraan terpotong karena menggunakan `object-cover` CSS property

5. **Production Deployment Issue**:
   - Local storage fallback tidak bekerja di Vercel (serverless environment)
   - Vercel Blob perlu dikonfigurasi untuk production

## Solusi yang Diterapkan

### 1. Update Upload API Route
- **File**: `/src/app/api/upload/route.ts`
- Mengubah ke properly extract File dari FormData
- Menambah file validation (size, type)
- Menambah 2 layer upload:
  - **Primary**: Vercel Blob (jika BLOB_READ_WRITE_TOKEN configured)
  - **Fallback**: Local storage di `/public/uploads/`
- Response mengembalikan format yang sesuai:
  ```json
  {
    "success": true,
    "imageUrl": "URL_TO_IMAGE",
    "url": "URL_TO_IMAGE",
    "source": "vercel-blob" | "local-storage"
  }
  ```

### 2. Frontend Improvements
- Image error handling with fallback icon di semua tempat image ditampilkan:
  - Vehicle list (line 1049)
  - Selected vehicle details (line 1325)
  - Complete rental dialog (line 1475)

### 3. Fix Image Cropping
- **File**: `/src/app/admin/dashboard/page.tsx`
- Mengubah `object-cover` menjadi `object-contain` di semua gambar kendaraan
- Menambah `bg-white/5` untuk background pada container gambar
- Ini memastikan gambar tidak terpotong dan menampilkan seluruh gambar

### 4. Production Deployment Fix
- **File**: `/src/app/api/upload/route.ts`
- Menghapus local storage fallback untuk production (Vercel)
- Menambah error message yang jelas jika Vercel Blob belum dikonfigurasi
- **WAJIB**: Setup Vercel Blob untuk production deployment
- Create `/public/uploads/` directory untuk local storage fallback
- Add `.gitkeep` file untuk ensure folder di-track oleh git

## File yang Diubah

1. `/src/app/api/upload/route.ts` - Upload handler diperbaiki untuk production
2. `/src/app/admin/dashboard/page.tsx` - Image error handling dan cropping fix ditambah
3. `/public/uploads/.gitkeep` - Created untuk folder tracking
4. `/VERCEL_BLOB_SETUP.md` - Dokumentasi setup Vercel Blob untuk production

## Setup untuk Production (VERCEL)

**WAJIB dilakukan sebelum deploy ke production:**

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login ke Vercel**:
   ```bash
   vercel login
   ```

3. **Setup Vercel Blob**:
   ```bash
   vercel blob
   ```

4. **Set Environment Variable di Vercel Dashboard**:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: (dari output command `vercel blob`)
   - Environment: Production

5. **Redeploy**:
   ```bash
   vercel --prod
   ```

## Testing Upload Flow

### Development (Local):
1. Buka Admin Dashboard
2. Klik tombol "Tambah" pada "Daftar Kendaraan"
3. Klik area upload untuk pilih gambar
4. Pilih file gambar (JPEG, PNG, WebP, atau GIF)
5. File akan di-upload dan preview akan tampil
6. Pastikan icon berubah from upload icon ke preview image
7. Klik "Tambah Kendaraan" untuk simpan

### Production (Vercel):
1. Pastikan Vercel Blob sudah dikonfigurasi (lihat Setup di atas)
2. Test upload gambar di admin dashboard
3. Jika error "Vercel Blob tidak dikonfigurasi", ikuti setup steps

## Troubleshooting

### Jika "File tidak ditemukan" muncul
1. Check browser console untuk error message detail
2. Pastikan file size < 5MB
3. Pastikan file type adalah image (JPEG, PNG, WebP, GIF)
4. Check `/public/uploads/` folder ada dan writable

### Jika "Vercel Blob tidak dikonfigurasi" muncul (Production)
1. Ikuti setup steps di `VERCEL_BLOB_SETUP.md`
2. Pastikan `BLOB_READ_WRITE_TOKEN` environment variable sudah diset di Vercel
3. Redeploy aplikasi setelah set environment variable

### Jika Gambar Terpotong
1. Pastikan CSS class menggunakan `object-contain` bukan `object-cover`
2. Gambar sekarang akan menampilkan seluruh gambar tanpa pemotongan
3. Jika gambar terlalu kecil, mungkin ada background putih transparan yang terlihat

## Notes

- **Production**: Upload handler hanya menggunakan Vercel Blob (local storage tidak didukung di Vercel)
- **Development**: Upload handler menggunakan Vercel Blob terlebih dahulu, fallback ke local storage
- Local fallback sangat useful untuk development/testing
- Filename di-generate dengan timestamp dan random string untuk avoid collision
- Image display sekarang have graceful fallback dengan icon jika image gagal load
- Gambar kendaraan tidak lagi terpotong dan menampilkan seluruh gambar
