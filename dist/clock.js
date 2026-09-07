// The match clock. One implementation, used by the web app and the graphics app.
//
// Written because two disagreeing implementations already existed in the web repo:
// matchUtils.ts derived the minute from elapsed time since kickoff_at, while the
// Scorebug overlay derived it from the highest logged event minute. The second one
// does not tick at all, which is fine for a lower-third and fatal for a scorebug.
//
// The clock is a pure function of `now` and a start timestamp. It is never streamed:
// that way it keeps running when the venue uplink drops, and it survives a restart.
/** Minute at which each period's clock starts, and the minute it caps at. */
const PERIOD = {
    '1h': { startMin: 0, capMin: 45 },
    '2h': { startMin: 45, capMin: 90 },
};
const HALFTIME_BREAK_MIN = 15;
const toMs = (v) => {
    if (!v)
        return null;
    const t = v instanceof Date ? v.getTime() : new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
};
const pad = (n) => (n < 10 ? '0' + n : String(n));
const fixed = (minute, label, isEstimate = false) => ({
    minute,
    added: null,
    totalSeconds: minute * 60,
    clock: `${minute}:00`,
    label,
    isRunning: false,
    isEstimate,
});
export function getMatchClock(input) {
    const { status, offsetSecs = 0, now = Date.now() } = input;
    if (status === 'pre')
        return fixed(0, 'PRE');
    if (status === 'ht')
        return fixed(45, 'HT');
    if (status === 'ft')
        return fixed(90, 'FT');
    if (status === 'abandoned')
        return fixed(90, 'ABD');
    const period = PERIOD[status];
    if (!period)
        return fixed(0, 'PRE');
    const started = toMs(input.periodStartedAt);
    const scheduled = toMs(input.kickoffAt);
    const isEstimate = started === null;
    let elapsedSecs;
    if (started !== null) {
        elapsedSecs = (now - started) / 1000;
    }
    else if (scheduled !== null) {
        // Legacy path: assume the match began at the scheduled time, and that half
        // time lasted exactly HALFTIME_BREAK_MIN. Preserved so behaviour does not
        // regress before migration 026 backfills period_started_at.
        const sinceKickoff = (now - scheduled) / 1000;
        elapsedSecs = status === '2h'
            ? sinceKickoff - (period.startMin + HALFTIME_BREAK_MIN) * 60
            : sinceKickoff;
    }
    else {
        return fixed(0, 'PRE', true);
    }
    const totalSeconds = Math.max(period.startMin * 60, Math.floor(period.startMin * 60 + elapsedSecs + offsetSecs));
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
export function getMatchMinute(input) {
    return getMatchClock(input).minute;
}
export function getStatusText(status) {
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
