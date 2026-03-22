const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function combineDateAndTime(date: Date | undefined, time: string): Date | null {
  if (!date) return null;

  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function calculateRentalDurationDays(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): number {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate || !endDate) return 0;

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs <= 0) return 0;

  return Math.max(1, Math.ceil(diffMs / DAY_IN_MS));
}

export function formatRentalDurationRule(days: number): string {
  if (days <= 1) {
    return 'Dihitung 1 hari (maks. 24 jam)';
  }

  return `Dibulatkan ${days} hari sesuai blok 24 jam`;
}

export function isRentalRangeValid(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): boolean {
  const startDate = toDate(start);
  const endDate = toDate(end);

  if (!startDate || !endDate) return false;

  return endDate.getTime() > startDate.getTime();
}
