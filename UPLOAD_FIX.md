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

### 3. Infrastructure Changes
- Create `/public/uploads/` directory untuk local storage fallback
- Add `.gitkeep` file untuk ensure folder di-track oleh git

## File yang Diubah

1. `/src/app/api/upload/route.ts` - Upload handler diperbaiki
2. `/src/app/admin/dashboard/page.tsx` - Image error handling ditambah
3. `/public/uploads/.gitkeep` - Created untuk folder tracking

## Testing Upload Flow

1. Buka Admin Dashboard
2. Klik tombol "Tambah" pada "Daftar Kendaraan"
3. Klik area upload untuk pilih gambar
4. Pilih file gambar (JPEG, PNG, WebP, atau GIF)
5. File akan di-upload dan preview akan tampil
6. Pastikan icon berubah from upload icon ke preview image
7. Klik "Tambah Kendaraan" untuk simpan

## Troubleshooting

### Jika "File tidak ditemukan" muncul
1. Check browser console untuk error message detail
2. Pastikan file size < 5MB
3. Pastikan file type adalah image (JPEG, PNG, WebP, GIF)
4. Check `/public/uploads/` folder ada dan writable

### Jika Gambar Tidak Tampil Setelah Ditambah
1. Check Network tab di developer tools - apakah image URL accessible
2. Jika menggunakan Vercel Blob, pastikan `BLOB_READ_WRITE_TOKEN` di-set dengan benar
3. Jika fallback ke local storage, pastikan `/public/uploads/` folder accessible

## Notes

- Upload handler sekarang support baik Vercel Blob maupun local file system
- Local fallback sangat useful untuk development/testing
- Filename di-generate dengan timestamp dan random string untuk avoid collision
- Image display sekarang have graceful fallback dengan icon jika image gagal load
