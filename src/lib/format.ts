/** Formats seconds into a compact mm:ss timer. */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/** Formats a ratio as a whole percentage string. */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
