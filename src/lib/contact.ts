export const DEVELOPER_WHATSAPP_NUMBER = '6285374383791';

export const STANDARD_TO_PREMIUM_MESSAGE =
  'Halo Pengembang, saya ingin upgrade akun saya dari Standart ke Premium.';

export function createWhatsAppUrl(message?: string): string {
  if (!message) {
    return `https://wa.me/${DEVELOPER_WHATSAPP_NUMBER}`;
  }

  return `https://wa.me/${DEVELOPER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
