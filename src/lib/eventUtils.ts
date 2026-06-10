import { Event } from '@/types';

const FAR_FUTURE = 9999999999999;

export function parseStartDate(period: string): number {
  if (!period) return FAR_FUTURE;
  const match = period.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3]).getTime();
  }
  return FAR_FUTURE;
}

export function parseEndDate(period: string): Date | null {
  if (!period || !period.includes('~')) return null;
  const endStr = period.split('~')[1]?.trim();
  if (!endStr || endStr.includes('소진')) return null;
  const parts = endStr.split('.');
  if (parts.length !== 3) return null;
  const end = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  end.setHours(23, 59, 59, 999);
  return isNaN(end.getTime()) ? null : end;
}

export function getDiffDays(period: string): number | null {
  if (!period) return null;
  const match = period.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!match) return null;
  const start = new Date(+match[1], +match[2] - 1, +match[3]);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isEventEnded(event: Event): boolean {
  if (event.status === '종료') return true;
  const end = parseEndDate(event.period);
  return end !== null && new Date() > end;
}

export function isEventActive(event: Event): boolean {
  if (isEventEnded(event) || !event.period) return false;
  const start = parseStartDate(event.period);
  return start !== FAR_FUTURE && Date.now() >= start;
}

export function getStatusPriority(event: Event): number {
  if (isEventEnded(event)) return 2;
  if (event.status === '예정') return 1;

  const start = parseStartDate(event.period);
  if (Date.now() < start) {
    if (start > 9000000000000) return 0; // unknown start date, treat as active
    return 1;
  }
  return 0;
}
