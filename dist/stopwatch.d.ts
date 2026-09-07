export interface ClockState {
    running: boolean;
    /** Seconds banked before the current run started. */
    baseSeconds: number;
    /** `Date.now()` when the current run started, or null when paused. */
    since: number | null;
}
export declare const STOPPED: ClockState;
/**
 * Where the clock reads right now.
 *
 * Derived rather than stored, which is what lets every surface agree without
 * anything ticking: two devices holding the same state and reading the same
 * wall clock get the same answer, and a surface that reconnects mid-run is
 * immediately correct rather than a few seconds behind.
 */
export declare function secondsOf(state: ClockState | null | undefined, now?: number): number;
/** `MM:SS`, and never negative — a clock reading `-1:59` is worse than `00:00`. */
export declare function formatClock(seconds: number): string;
export declare function play(state: ClockState, now?: number): ClockState;
export declare function pause(state: ClockState, now?: number): ClockState;
export declare function reset(): ClockState;
/**
 * Move the clock to a given second.
 *
 * Keeps running if it was running, which is the behaviour an operator correcting
 * a drifted clock mid-half expects: they are fixing the number, not stopping the
 * match. Refuses anything that is not a number of seconds rather than quietly
 * putting `NaN` on air.
 */
export declare function set(state: ClockState, seconds: number, now?: number): {
    ok: true;
    state: ClockState;
} | {
    ok: false;
    error: string;
};
/** `MM:SS` or `M:SS` from an operator's typing, to seconds. Null when it is not one. */
export declare function parseClock(input: string): number | null;
