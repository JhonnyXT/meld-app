export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function trialDaysLeft(startedAt: string, now: Date = new Date()): number {
  const elapsedDays = Math.floor((now.getTime() - new Date(startedAt).getTime()) / DAY_MS);
  return Math.max(0, TRIAL_DAYS - elapsedDays);
}

export function expiredTrialStart(now: Date = new Date()): string {
  return new Date(now.getTime() - (TRIAL_DAYS + 1) * DAY_MS).toISOString();
}
