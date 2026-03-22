export type RentalOperationalStatus = 'active' | 'completed' | 'overdue' | 'none';

type RentalLike = {
  status?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  user?: { name?: string | null } | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLatestRental(rentals?: RentalLike[] | null): RentalLike | null {
  if (!rentals || rentals.length === 0) {
    return null;
  }

  return rentals[0] ?? null;
}

export function getRentalOperationalStatus(
  rental?: RentalLike | null,
  now = new Date(),
): RentalOperationalStatus {
  if (!rental) {
    return 'none';
  }

  if (rental.status !== 'active') {
    return 'completed';
  }

  const endDate = toDate(rental.endDate);
  if (endDate && endDate.getTime() < now.getTime()) {
    return 'overdue';
  }

  return 'active';
}

export function getRentalOperationalLabel(status: RentalOperationalStatus): string {
  switch (status) {
    case 'active':
      return 'Aktif';
    case 'completed':
      return 'Selesai';
    case 'overdue':
      return 'Terlambat';
    default:
      return 'Belum Ada';
  }
}

export function getRentalOperationalBadgeClass(status: RentalOperationalStatus): string {
  switch (status) {
    case 'active':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'completed':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'overdue':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    default:
      return 'bg-white/10 text-white/60 border border-white/10';
  }
}

export function formatRentalDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatRentalDateTime(value: Date | string | null | undefined): string {
  const date = toDate(value);
  if (!date) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
