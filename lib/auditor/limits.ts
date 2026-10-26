export const SUBMISSION_LIMITS = {
  monthlyAnalyses: 10,
  maxPerSubmission: 20,
  maxFiles: 500,
  maxTotalBytes: 25 * 1024 * 1024,
  maxFileBytes: 512 * 1024,
} as const;

export function currentCreditMonth(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function nextRenewal(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
