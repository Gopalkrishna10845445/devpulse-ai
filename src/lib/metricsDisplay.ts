/** Shared UI formatting for missing telemetry. Do not invent placeholder numbers. */

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unavailable';
  return `${value}/100`;
}

export function formatCount(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return 'Unavailable';
  return suffix ? `${value}${suffix}` : String(value);
}
