// Where the server's clock is, relative to this device's.
//
// The panel and the overlay pass absolute times to each other — when the
// stopwatch started, when a graphic was taken, when it comes off — and each
// reads them against its own `Date.now()`. That only works if the two devices
// agree on the time, and on 2026-11-21 they did not: the Live Control laptop
// was 136s slow, so the YoloBox ran the clock 2:16 ahead and expired every
// timed graphic the moment it arrived (miniStats, goal, subs, cards). The panel
// looked fine, because it compared its slow clock with itself.
//
// So every surface measures how far its clock is from the server's, and stamps
// and compares in server time: `Date.now() + offset`. A wrong clock on any one
// device then stops mattering.
//
// Pure apart from the `ask` it is handed. The network call, the retry triggers
// and where the offset is held belong to each app; the arithmetic, and how a
// good sample is told from a bad one, live here once.
/**
 * The offset from the sample with the shortest round trip.
 *
 * The server's reading is taken somewhere inside the round trip, and the
 * midpoint is the best guess at where. The error is half the difference between
 * the outbound and return legs, so it is bounded by half the round trip — which
 * makes the quickest sample the most trustworthy one, not the average of all of
 * them. A sample whose round trip is negative or not a number (the device's
 * clock moved mid-request) is discarded rather than believed.
 */
export function offsetFrom(samples) {
    let best = null;
    for (const sample of samples) {
        const roundTrip = sample.received - sample.sent;
        if (!Number.isFinite(roundTrip) || roundTrip < 0 || !Number.isFinite(sample.server))
            continue;
        if (best && roundTrip >= best.roundTrip)
            continue;
        best = { offset: Math.round(sample.server - (sample.sent + roundTrip / 2)), roundTrip };
    }
    return best;
}
/**
 * Take `count` samples one after another and return the best, or null if none
 * of them came back.
 *
 * Sequential on purpose: requests in flight together queue behind each other on
 * a venue uplink, and the queueing is exactly the asymmetry that corrupts the
 * midpoint. `ask` resolves to the server's `Date.now()` and rejects on any
 * failure; a rejection costs one sample, not the measurement.
 */
export async function measureOffset(ask, count = 3, now = Date.now) {
    const samples = [];
    for (let i = 0; i < count; i++) {
        const sent = now();
        try {
            const server = await ask();
            samples.push({ sent, server, received: now() });
        }
        catch {
            // One failed sample is not a failed measurement.
        }
    }
    return offsetFrom(samples);
}
