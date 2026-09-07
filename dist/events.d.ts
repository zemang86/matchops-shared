import type { LiveData, LiveEvent } from './domain.js';
/**
 * The events a graphic may be read from, oldest first.
 *
 * Falls back to `lastEvent` alone when the array is absent, which is what a
 * deploy that predates it sends. That build then behaves exactly as it used to
 * — an incident is reachable only while it is the most recent one — rather than
 * losing the card and substitution graphics altogether.
 *
 * The fallback matters more to the scorebug's red cards than to anything else
 * that reads this. Counting `live.events` directly would have shown a sending
 * off for as long as it was the newest thing that happened and then dropped it
 * at the next throw-in, so a team would go back up to eleven men on air.
 */
export declare function eventPool(live: LiveData | null | undefined): LiveEvent[];
/**
 * Which side an event belongs to, or null when nothing in it says.
 *
 * `team` is what `electron/shape.js` writes and is the answer whenever the app
 * shaped the payload itself. The two name comparisons are for the payload the
 * server shapes: that transformer is a separate implementation in a separate
 * repo, `equivalence:check` is the only thing that compares them, and it cannot
 * run offline. A field that might not be there is not a field to build a
 * side-of-the-pitch decision on alone.
 *
 * Null rather than a guess. An event whose side cannot be established draws
 * nothing, because the failure being avoided is telling viewers that the wrong
 * team is down to ten men — and a coin toss gets that wrong half the time while
 * looking exactly as confident as the truth.
 */
export declare function sideOf(event: LiveEvent, live: LiveData | null | undefined): 'home' | 'away' | null;
/**
 * How many red cards the bug will draw for a side.
 *
 * Three is not a guess about the laws of the game — a side can in principle be
 * reduced to seven — it is the width of the flat run on top of the team panel,
 * which is where these are drawn. Beyond three there is no artwork to put them
 * on, and a fourth card overlapping the clock cap's shoulder is worse than a
 * fourth card that is not shown.
 */
export declare const MAX_RED_CARDS = 3;
/**
 * Red cards per side, counted off the event list.
 *
 * Events and not `stats.redCards`, which is the league's own tally and the
 * number the team stats board draws. The two are different sources with
 * different owners and they are allowed to disagree: the stats table is keyed
 * in by whoever keeps the stats, and the event list is keyed in by whoever is
 * watching the match. The bug follows the second, because the bug is on air
 * while the incident is happening.
 *
 * Only `red`. A second yellow becomes a sending off in the database only when
 * somebody keys the red in, so counting yellows here would invent a rule the
 * competition does not follow and put a man off who is still on the pitch.
 */
export declare function redCards(live: LiveData | null | undefined): {
    home: number;
    away: number;
};
