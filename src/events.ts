// Reading the match's event list, for everything that derives a fact from it.
//
// This used to live inside `src/control/payloads.ts`, which is where the only
// reader was. The scorebug is the second, and it runs in the render window —
// which must not import from `src/control`, because that side of the app is
// bridge calls, picker state and arming logic, and a template reaching into it
// drags all of that into the graphic that goes on air.
//
// So the pool moved here, to the same shelf as `types.ts`: shared by both
// windows, owned by neither.

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
export function eventPool(live: LiveData | null | undefined): LiveEvent[] {
  if (live?.events?.length) return live.events;
  return live?.lastEvent ? [live.lastEvent] : [];
}

const upper = (value: string | undefined): string => value?.trim().toUpperCase() ?? '';

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
export function sideOf(event: LiveEvent, live: LiveData | null | undefined): 'home' | 'away' | null {
  if (event.team === 'home' || event.team === 'away') return event.team;

  const short = upper(event.teamShort);
  if (short) {
    if (short === upper(live?.home?.short)) return 'home';
    if (short === upper(live?.away?.short)) return 'away';
  }

  const name = upper(event.teamName);
  if (name) {
    if (name === upper(live?.home?.name)) return 'home';
    if (name === upper(live?.away?.name)) return 'away';
  }

  return null;
}

/**
 * How many red cards the bug will draw for a side.
 *
 * Three is not a guess about the laws of the game — a side can in principle be
 * reduced to seven — it is the width of the flat run on top of the team panel,
 * which is where these are drawn. Beyond three there is no artwork to put them
 * on, and a fourth card overlapping the clock cap's shoulder is worse than a
 * fourth card that is not shown.
 */
export const MAX_RED_CARDS = 3;

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
export function redCards(live: LiveData | null | undefined): { home: number; away: number } {
  const tally = { home: 0, away: 0 };

  for (const event of eventPool(live)) {
    if (event.type !== 'red') continue;
    const which = sideOf(event, live);
    if (which) tally[which] = Math.min(tally[which] + 1, MAX_RED_CARDS);
  }

  return tally;
}
