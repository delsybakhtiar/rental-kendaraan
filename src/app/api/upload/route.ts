import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/jwt';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "File tidak ditemukan", success: false },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File terlalu besar (max 5MB)", success: false },
        { status: 400 }
      );
    }

    // Validate file type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak valid. Gunakan JPEG, PNG, WebP, atau GIF", success: false },
        { status: 400 }
      );
    }

    // Generate filename dengan timestamp
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `vehicle-${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: "Upload gagal: BLOB_READ_WRITE_TOKEN belum dikonfigurasi.",
          success: false,
        },
        { status: 500 }
      );
    }

    try {
      // Try Vercel Blob
      const { put } = await import('@vercel/blob');

      const blob = await put(filename, file, {
        access: 'public',
      });

      return NextResponse.json({
        success: true,
        imageUrl: blob.url,
        url: blob.url,
        source: 'vercel-blob',
      });
    } catch (blobError) {
      console.error('Vercel Blob upload failed:', blobError);

      // In production (Vercel), we can't use local storage
      // Return clear error message
      return NextResponse.json(
        {
          error: "Upload gagal: Vercel Blob tidak dikonfigurasi. Silakan hubungi administrator untuk setup storage.",
          success: false,
          details: process.env.NODE_ENV === 'development' ? blobError instanceof Error ? blobError.message : 'Unknown error' : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Gagal mengupload file",
        success: false
      },
      { status: 500 }
    );
  }
}
