const collectorUrl = 'http://127.0.0.1:3102';

export async function getSentryEnvelopes(): Promise<string[]> {
  const response = await fetch(`${collectorUrl}/events`);
  if (!response.ok) throw new Error('Could not read the local Sentry collector.');
  return response.json() as Promise<string[]>;
}

export async function resetSentryCollector(): Promise<void> {
  const response = await fetch(`${collectorUrl}/reset`, { method: 'POST' });
  if (!response.ok) throw new Error('Could not reset the local Sentry collector.');
}
