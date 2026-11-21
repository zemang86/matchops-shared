/** One round trip to the server's clock. */
export interface TimeSample {
    /** This device's `Date.now()` just before the request went out. */
    sent: number;
    /** The server's `Date.now()` as it answered. */
    server: number;
    /** This device's `Date.now()` as the answer arrived. */
    received: number;
}
export interface ClockOffset {
    /** Add to `Date.now()` to get server time, in ms. Positive when this device is slow. */
    offset: number;
    /** The round trip it was measured over, in ms. The error is at most half of it. */
    roundTrip: number;
}
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
export declare function offsetFrom(samples: readonly TimeSample[]): ClockOffset | null;
/**
 * Take `count` samples one after another and return the best, or null if none
 * of them came back.
 *
 * Sequential on purpose: requests in flight together queue behind each other on
 * a venue uplink, and the queueing is exactly the asymmetry that corrupts the
 * midpoint. `ask` resolves to the server's `Date.now()` and rejects on any
 * failure; a rejection costs one sample, not the measurement.
 */
export declare function measureOffset(ask: () => Promise<number>, count?: number, now?: () => number): Promise<ClockOffset | null>;
