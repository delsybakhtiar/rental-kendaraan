import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';

const BOOKING_CODE_PREFIX = 'OTM';
const BOOKING_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BOOKING_CODE_LENGTH = 6;

function randomBookingCodeBody(length = BOOKING_CODE_LENGTH): string {
  const bytes = randomBytes(length);

  return Array.from(bytes, (byte) => BOOKING_CODE_ALPHABET[byte % BOOKING_CODE_ALPHABET.length]).join('');
}

export function formatBookingCode(code: string): string {
  return `${BOOKING_CODE_PREFIX}-${code}`.toUpperCase();
}

export function deriveFallbackBookingCode(id: string): string {
  return formatBookingCode(id.replace(/[^a-zA-Z0-9]/g, '').slice(-BOOKING_CODE_LENGTH).padStart(BOOKING_CODE_LENGTH, '0'));
}

export async function generateUniqueBookingCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = formatBookingCode(randomBookingCodeBody());
    const existing = await db.rental.findFirst({
      where: {
        notes: {
          contains: `"bookingCode":"${candidate}"`,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Gagal membuat booking code unik');
}
