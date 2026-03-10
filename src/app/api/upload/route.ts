import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request): Promise<NextResponse> {
  try {
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
    
    try {
      // Try Vercel Blob if available
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
      console.warn('Vercel Blob upload failed, trying local storage:', blobError);
      
      // Fallback: Save locally
      try {
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        
        // Create directory if not exists
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);
        
        // Return local path as URL
        const imageUrl = `/uploads/${filename}`;
        
        return NextResponse.json({
          success: true,
          imageUrl,
          url: imageUrl,
          source: 'local-storage',
        });
      } catch (localError) {
        console.error('Local storage fallback failed:', localError);
        throw localError;
      }
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