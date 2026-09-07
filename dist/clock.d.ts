export type MatchStatus = 'pre' | '1h' | 'ht' | '2h' | 'ft' | 'abandoned';
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
export declare function getMatchClock(input: ClockInput): MatchClock;
/** Convenience for callers that only want the number, matching the old signature. */
export declare function getMatchMinute(input: ClockInput): number;
export declare function getStatusText(status: MatchStatus | string): string;
