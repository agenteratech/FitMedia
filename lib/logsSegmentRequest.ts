type LogsSegment = 'workout' | 'diet' | 'sleep';

let _pending: LogsSegment | null = null;

/** Call this before navigating to the Logs tab to request a specific segment. */
export function requestLogsSegment(segment: LogsSegment) {
  _pending = segment;
}

/**
 * Read and clear the pending segment in one atomic step.
 * Returns null if no request is pending.
 */
export function takePendingLogsSegment(): LogsSegment | null {
  const s = _pending;
  _pending = null;
  return s;
}
