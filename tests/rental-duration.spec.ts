import { expect, test } from '@playwright/test';
import {
  calculateRentalDurationDays,
  combineDateAndTime,
  isRentalRangeValid,
} from '@/lib/rental-duration';

test.describe('Rental duration 24-hour rule', () => {
  test('22 jam 14:00 sampai 23 jam 14:00 dihitung 1 hari', () => {
    const start = new Date('2026-03-22T14:00:00.000Z');
    const end = new Date('2026-03-23T14:00:00.000Z');

    expect(calculateRentalDurationDays(start, end)).toBe(1);
  });

  test('kurang dari 24 jam tetap dihitung 1 hari', () => {
    const start = new Date('2026-03-22T14:00:00.000Z');
    const end = new Date('2026-03-22T20:00:00.000Z');

    expect(calculateRentalDurationDays(start, end)).toBe(1);
  });

  test('lebih dari 1 hari ditambah beberapa jam dibulatkan ke hari berikutnya', () => {
    const start = new Date('2026-03-22T14:00:00.000Z');
    const end = new Date('2026-03-23T16:30:00.000Z');

    expect(calculateRentalDurationDays(start, end)).toBe(2);
  });

  test('rentang waktu yang sama atau mundur dianggap tidak valid', () => {
    const start = combineDateAndTime(new Date('2026-03-22T00:00:00.000Z'), '14:00');
    const same = combineDateAndTime(new Date('2026-03-22T00:00:00.000Z'), '14:00');
    const earlier = combineDateAndTime(new Date('2026-03-22T00:00:00.000Z'), '13:00');

    expect(isRentalRangeValid(start, same)).toBe(false);
    expect(isRentalRangeValid(start, earlier)).toBe(false);
  });
});
