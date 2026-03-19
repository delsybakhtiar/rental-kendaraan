export const DEVELOPER_WHATSAPP_NUMBER = '6285374383791';

export const STANDARD_TO_PREMIUM_MESSAGE =
  'Halo Pengembang, saya ingin upgrade akun saya dari Standart ke Premium.';

export const PRICING_CONSULTATION_MESSAGE =
  'Halo Vura Design, saya ingin konsultasi paket Otomas untuk kebutuhan operasional rental saya.';

export function createPackageInquiryMessage(packageName: string): string {
  return `Halo Vura Design, saya tertarik dengan ${packageName} Otomas. Saya ingin lihat demo dan konsultasi kebutuhan rental saya.`;
}

export function createWhatsAppUrl(message?: string): string {
  if (!message) {
    return `https://wa.me/${DEVELOPER_WHATSAPP_NUMBER}`;
  }

  return `https://wa.me/${DEVELOPER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
