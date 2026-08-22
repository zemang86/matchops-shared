// The match clock. One implementation, used by the web app and the graphics app.
//
// Written because two disagreeing implementations already existed in the web repo:
// matchUtils.ts derived the minute from elapsed time since kickoff_at, while the
// Scorebug overlay derived it from the highest logged event minute. The second one
// does not tick at all, which is fine for a lower-third and fatal for a scorebug.
//
// The clock is a pure function of `now` and a start timestamp. It is never streamed:
// that way it keeps running when the venue uplink drops, and it survives a restart.

export type MatchStatus = 'pre' | '1h' | 'ht' | '2h' | 'ft' | 'abandoned';

/** Minute at which each period's clock starts, and the minute it caps at. */
const PERIOD = {
  '1h': { startMin: 0, capMin: 45 },
  '2h': { startMin: 45, capMin: 90 },
} as const;

const HALFTIME_BREAK_MIN = 15;

export interface ClockInput {
  status: MatchStatus | string;
  /**
   * When the CURRENT period actually kicked off — the source of truth.
   * (matches.period_started_at, migration 026.)
   */
  periodStartedAt?: string | Date | null;
  /**
   * Fallback when periodStartedAt is absent: the SCHEDULED kickoff. Using this
   * assumes the match started on time and that half time was exactly 15 minutes.
   * Both are usually false, so anything derived from it is flagged isEstimate.
   */
  kickoffAt?: string | Date | null;
  /** Operator-local correction in seconds. Deliberately not persisted. */
  offsetSecs?: number;
  /** Injectable clock, for tests and deterministic rendering. */
  now?: number;
}

export interface MatchClock {
  /** Football minute, 1-based and capped at the period end. 45+2 reports minute 45. */
  minute: number;
  /** Minutes into added time, or null when inside normal time. */
  added: number | null;
  /** Seconds elapsed on the match timeline (second half continues from 2700). */
  totalSeconds: number;
  /** Broadcast clock, counting up: "67:04". */
  clock: string;
  /** What a scorebug shows: "67'", "45+2", "HT", "FT". */
  label: string;
  /** True while a period is actually running. */
  isRunning: boolean;
  /** True when derived from scheduled kickoff rather than a real period start. */
  isEstimate: boolean;
}

const toMs = (v: string | Date | null | undefined): number | null => {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

const pad = (n: number): string => (n < 10 ? '0' + n : String(n));

const fixed = (minute: number, label: string, isEstimate = false): MatchClock => ({
  minute,
  added: null,
  totalSeconds: minute * 60,
  clock: `${minute}:00`,
  label,
  isRunning: false,
  isEstimate,
});

export function getMatchClock(input: ClockInput): MatchClock {
  const { status, offsetSecs = 0, now = Date.now() } = input;

  if (status === 'pre') return fixed(0, 'PRE');
  if (status === 'ht') return fixed(45, 'HT');
  if (status === 'ft') return fixed(90, 'FT');
  if (status === 'abandoned') return fixed(90, 'ABD');

  const period = PERIOD[status as '1h' | '2h'];
  if (!period) return fixed(0, 'PRE');

  const started = toMs(input.periodStartedAt);
  const scheduled = toMs(input.kickoffAt);
  const isEstimate = started === null;

  let elapsedSecs: number;
  if (started !== null) {
    elapsedSecs = (now - started) / 1000;
  } else if (scheduled !== null) {
    // Legacy path: assume the match began at the scheduled time, and that half
    // time lasted exactly HALFTIME_BREAK_MIN. Preserved so behaviour does not
    // regress before migration 026 backfills period_started_at.
    const sinceKickoff = (now - scheduled) / 1000;
    elapsedSecs = status === '2h'
      ? sinceKickoff - (period.startMin + HALFTIME_BREAK_MIN) * 60
      : sinceKickoff;
  } else {
    return fixed(0, 'PRE', true);
  }

  const totalSeconds = Math.max(
    period.startMin * 60,
    Math.floor(period.startMin * 60 + elapsedSecs + offsetSecs),
  );

  // Football minutes are 1-based: 0:30 is in the 1st minute, 45:00 is 45+1.
  const rawMinute = Math.floor(totalSeconds / 60) + 1;
  const added = rawMinute > period.capMin ? rawMinute - period.capMin : null;
  const minute = Math.min(rawMinute, period.capMin);

  return {
    minute,
    added,
    totalSeconds,
    clock: `${Math.floor(totalSeconds / 60)}:${pad(totalSeconds % 60)}`,
    label: added !== null ? `${period.capMin}+${added}` : `${minute}'`,
    isRunning: true,
    isEstimate,
  };
}

/** Convenience for callers that only want the number, matching the old signature. */
export function getMatchMinute(input: ClockInput): number {
  return getMatchClock(input).minute;
}

export function getStatusText(status: MatchStatus | string): string {
  switch (status) {
    case 'pre': return 'Upcoming';
    case '1h': return '1st Half';
    case 'ht': return 'Half Time';
    case '2h': return '2nd Half';
    case 'ft': return 'Full Time';
    case 'abandoned': return 'Abandoned';
    default: return 'Unknown';
  }
}
