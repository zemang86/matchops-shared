// The operator's stopwatch. Not the match clock.
//
// `clock.ts` in this package derives a minute from kickoff and status — what a
// spectator would compute. This is the other thing: a stopwatch the operator
// starts, pauses and corrects by hand, which is what the scorebug actually
// shows. The two are unrelated and both are wanted.
//
// Pure transitions on a plain state, so the same four operations can run in the
// desktop app's main process, in a Netlify function, or in a browser. Nothing
// here reads a clock except through `now`, which is passed in so a test can lie
// about it.
//
// **`electron/clock.js` in the graphics repo is a second implementation of these
// four transitions**, wrapped around persisted module state. It predates this
// file and was left alone deliberately: it is on the broadcast path and its
// behaviour is covered by checks there. Whoever next touches it should make it
// call these, and delete its copies — the shapes already agree.
export const STOPPED = { running: false, baseSeconds: 0, since: null };
/**
 * Where the clock reads right now.
 *
 * Derived rather than stored, which is what lets every surface agree without
 * anything ticking: two devices holding the same state and reading the same
 * wall clock get the same answer, and a surface that reconnects mid-run is
 * immediately correct rather than a few seconds behind.
 */
export function secondsOf(state, now = Date.now()) {
    if (!state)
        return 0;
    const running = state.since !== null ? (now - state.since) / 1000 : 0;
    return Math.max(0, state.baseSeconds + running);
}
/** `MM:SS`, and never negative — a clock reading `-1:59` is worse than `00:00`. */
export function formatClock(seconds) {
    const whole = Math.max(0, Math.floor(seconds));
    return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}
export function play(state, now = Date.now()) {
    if (state.since !== null)
        return { ...state, running: true };
    return { running: true, baseSeconds: state.baseSeconds, since: now };
}
export function pause(state, now = Date.now()) {
    if (state.since === null)
        return { ...state, running: false };
    return { running: false, baseSeconds: secondsOf(state, now), since: null };
}
export function reset() {
    return { ...STOPPED };
}
/**
 * Move the clock to a given second.
 *
 * Keeps running if it was running, which is the behaviour an operator correcting
 * a drifted clock mid-half expects: they are fixing the number, not stopping the
 * match. Refuses anything that is not a number of seconds rather than quietly
 * putting `NaN` on air.
 */
export function set(state, seconds, now = Date.now()) {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value < 0) {
        return { ok: false, error: 'A clock time must be a number of seconds, zero or more.' };
    }
    return {
        ok: true,
        state: {
            running: state.running,
            baseSeconds: value,
            since: state.since !== null ? now : null,
        },
    };
}
/** `MM:SS` or `M:SS` from an operator's typing, to seconds. Null when it is not one. */
export function parseClock(input) {
    const match = /^\s*(\d{1,3})\s*:\s*([0-5]?\d)\s*$/.exec(input);
    if (!match)
        return null;
    return Number(match[1]) * 60 + Number(match[2]);
}
