// What a graphic will put on air, worked out before the operator presses TAKE.
//
// This is the useful half of automation. The data never fires a graphic — a
// goal chalked off by VAR would already be on screen if it did, and the
// operator watching the incident knows before the data does. What the data does
// earn is the button arming itself with the payload ready and a one-line
// summary of exactly what will appear, so nobody takes a lower third to find out
// what is on it.
//
// The payload is built here, in the control window, and travels with the take.
// That is what makes firing graphics with the uplink down work: whatever the
// mirror held when the button was pressed is what goes to air.
import { headlineFor } from './headline.js';
import { eventPool } from './events.js';
import { passBoard } from './passes.js';
const GOAL_TYPES = new Set(['goal', 'own_goal']);
const CARD_TYPES = new Set(['yellow', 'red']);
const SUB_TYPES = new Set(['sub_in', 'sub_out']);
/** Event types spelled the way an operator would say them, for the "why not" line. */
const EVENT_LABEL = {
    goal: 'a goal',
    own_goal: 'an own goal',
    yellow: 'a yellow card',
    red: 'a red card',
    sub_in: 'a substitution',
    sub_out: 'a substitution',
    assist: 'an assist',
    var: 'a VAR check',
    injury: 'an injury',
};
/** The same types in the words a scoreboard would use, for the latest-event card. */
const EVENT_KICKER = {
    goal: 'GOAL',
    own_goal: 'OWN GOAL',
    yellow: 'YELLOW',
    red: 'RED',
    sub_in: 'SUB',
    sub_out: 'SUB',
    assist: 'ASSIST',
    var: 'VAR',
    injury: 'INJURY',
};
const NO_EVENTS = 'No events recorded in this match yet.';
/**
 * The most recent event of one of `types`, and how many events have landed on
 * top of it.
 *
 * Searching backwards rather than requiring the incident to be the latest thing
 * that happened is the whole point: an operator watching a booking fires it
 * seconds later, and a throw-in recorded in between used to take the button away.
 */
function mostRecent(live, types) {
    const pool = eventPool(live);
    for (let i = pool.length - 1; i >= 0; i -= 1) {
        // Bound once rather than indexed twice: this package compiles with
        // `noUncheckedIndexedAccess`, and the second read was the one the compiler
        // could not prove safe.
        const event = pool[i];
        if (event && types.has(event.type ?? ''))
            return { event, since: pool.length - 1 - i };
    }
    return null;
}
/**
 * Said out loud on the summary line when the armed incident is not the latest.
 *
 * An operator about to put a name on air needs to see that it is not the thing
 * they just watched. The minute is always there too, so the two together are
 * enough to catch a mis-fire before it is on the programme feed.
 */
function staleness(since) {
    if (since === 0)
        return '';
    return ` — ${since} event${since === 1 ? '' : 's'} since`;
}
/**
 * Why an event-driven graphic cannot be armed.
 *
 * Two genuinely different reasons, and conflating them sends the operator
 * looking in the wrong place: either the match has no such incident, or this
 * deploy only ever tells us about the most recent one.
 */
function noneOfType(live, what) {
    const pool = eventPool(live);
    if (pool.length === 0)
        return NO_EVENTS;
    if (!live?.events?.length) {
        const type = live?.lastEvent?.type;
        const label = EVENT_LABEL[type ?? ''] ?? `a ${type}`;
        return `The last event is ${label}, and this deploy sends only the most recent one.`;
    }
    return `No ${what} has been recorded in this match yet.`;
}
/** Named players in a side's starting eleven. */
const namedStarters = (lineup, side) => (lineup?.[side]?.starting ?? []).filter((player) => player?.name).length;
const side = (match, live, which) => (which === 'home'
    ? match?.homeTeam?.shortName || live?.home?.short
    : match?.awayTeam?.shortName || live?.away?.short) || which.toUpperCase();
/**
 * The last thing that happened in the match, whatever kind of thing it was.
 *
 * Every other reader here asks for the most recent event *of a type*, because
 * it is arming a particular graphic. This one arms nothing — it answers "what
 * just happened", which is the question the operator is asking a second before
 * they reach for a graphic, and which the rack can only answer by being read
 * nine rows at a time.
 */
export function latestEvent(live) {
    const pool = eventPool(live);
    const event = pool[pool.length - 1];
    if (!event)
        return null;
    const who = event.type === 'sub_in' || event.type === 'sub_out'
        ? [event.player, event.relatedPlayer].filter(Boolean).join(' / ')
        : (event.player ?? 'Unknown');
    return {
        kicker: EVENT_KICKER[event.type ?? ''] ?? (event.type ?? 'EVENT').toUpperCase(),
        minute: event.minute != null ? `${event.minute}'` : '—',
        who,
        team: event.teamShort ?? event.teamName ?? '',
    };
}
/**
 * What the button should say, and whether it can be pressed.
 *
 * `onAir` is the set of graphic ids currently up. Only the docked panel reads
 * it — it cannot go up without the graphic it hangs off, and the operator
 * deserves to be told that by the button rather than by a take that fails.
 * Optional so a caller with no playout state still gets every other answer;
 * the main process enforces the rule regardless, so an omitted set can only
 * make a button look available, never put a floating panel on air.
 */
/**
 * Whether a graphic hangs off something that is not on air.
 *
 * One rule, two callers with different prose. `electron/graphics.js` refuses the
 * take outright and is the thing that actually enforces it; this is the same
 * rule said early enough for the operator to see why a button is dark, and the
 * sentence explaining it belongs with the graphic rather than here — the
 * possession panel drops out from under the bug and added time rises from
 * behind it, and telling the operator which is the whole value of the line.
 */
export const hostIsDown = (def, onAir) => Boolean(def.attachedTo && onAir && !onAir.has(def.attachedTo));
export function arm(def, context, onAir) {
    const { match, live, lineup, stats } = context;
    if (!match)
        return { ready: false, data: null, summary: 'No match bound.' };
    switch (def.id) {
        case 'scorebug': {
            const score = `${live?.home?.score ?? 0}–${live?.away?.score ?? 0}`;
            // Deliberately not gated on live data. A scorebug that refuses to go up
            // until the first poll lands is worse than one showing 0-0, which is very
            // probably the score.
            return {
                ready: true,
                data: null,
                summary: `${side(match, live, 'home')} ${score} ${side(match, live, 'away')}${live ? '' : ' — no live data yet, will fill in'}`,
            };
        }
        case 'goal': {
            const found = mostRecent(live, GOAL_TYPES);
            if (!found)
                return { ready: false, data: null, summary: noneOfType(live, 'goal') };
            const { event, since } = found;
            const payload = {
                player: event.player,
                playerForms: event.playerForms,
                playerNumber: event.playerNumber,
                minute: event.minute,
                teamName: event.teamName,
                teamShort: event.teamShort,
                type: event.type,
            };
            const kicker = event.type === 'own_goal' ? 'OWN GOAL' : 'GOAL';
            const minute = event.minute != null ? `${event.minute}' ` : '';
            return {
                ready: true,
                data: payload,
                summary: `${kicker} — ${minute}${event.player ?? 'unknown'} (${event.teamShort ?? ''})${staleness(since)}`,
            };
        }
        case 'card': {
            const found = mostRecent(live, CARD_TYPES);
            if (!found)
                return { ready: false, data: null, summary: noneOfType(live, 'card') };
            const { event, since } = found;
            const payload = {
                player: event.player,
                playerForms: event.playerForms,
                playerNumber: event.playerNumber,
                minute: event.minute,
                teamName: event.teamName,
                teamShort: event.teamShort,
                card: event.type,
            };
            const colour = event.type === 'red' ? 'RED' : 'YELLOW';
            const minute = event.minute != null ? `${event.minute}' ` : '';
            return {
                ready: true,
                data: payload,
                summary: `${colour} — ${minute}${event.player ?? 'unknown'} (${event.teamShort ?? ''})${staleness(since)}`,
            };
        }
        case 'substitution': {
            const found = mostRecent(live, SUB_TYPES);
            if (!found)
                return { ready: false, data: null, summary: noneOfType(live, 'substitution') };
            const { event, since } = found;
            // The events table records one row with a related player, and which of
            // the two is arriving depends on which way round the row was written.
            // Getting this backwards puts the wrong name under the upward arrow, so
            // it is resolved here rather than left to the template.
            const arriving = event.type === 'sub_in';
            const payload = {
                playerOn: arriving ? event.player : event.relatedPlayer,
                playerOnForms: arriving ? event.playerForms : event.relatedPlayerForms,
                playerOnNumber: arriving ? event.playerNumber : event.relatedPlayerNumber,
                playerOff: arriving ? event.relatedPlayer : event.player,
                playerOffForms: arriving ? event.relatedPlayerForms : event.playerForms,
                playerOffNumber: arriving ? event.relatedPlayerNumber : event.playerNumber,
                minute: event.minute,
                teamName: event.teamName,
                teamShort: event.teamShort,
            };
            if (!payload.playerOn || !payload.playerOff) {
                return {
                    ready: false,
                    data: null,
                    summary: 'The substitution has only one player on it — the other side was not recorded.',
                };
            }
            const minute = event.minute != null ? `${event.minute}' ` : '';
            return {
                ready: true,
                data: payload,
                summary: `SUB — ${minute}${payload.playerOn} on for ${payload.playerOff}${staleness(since)}`,
            };
        }
        case 'passes': {
            const board = passBoard(stats);
            // The gate this graphic exists behind, and the reason it has one at all.
            //
            // Zero in `possession_counts` means nobody entered counts, not that a
            // match was played without a pass — so a board drawn from an empty column
            // would put HANTARAN 0 – 0 on air over a match with several hundred of
            // them. `src/passes.ts` returns null for exactly that, and this is the
            // point where refusing costs nothing: a dark button is a graphic nobody
            // had to notice was wrong.
            //
            // It is dark for most of a match, and that is correct rather than
            // unfortunate. The counts are typed into the stats tab, and the second
            // half usually lands at full time — so this arms at half time with one
            // half on it and again at the end with both.
            if (!board) {
                return {
                    ready: false,
                    data: null,
                    summary: stats?.stats
                        ? 'No pass counts entered yet — nothing to draw but noughts.'
                        : 'No stats held for this match yet.',
                };
            }
            const home = side(match, live, 'home');
            const away = side(match, live, 'away');
            const totals = `${home} ${board.match.home} – ${board.match.away} ${away}`;
            // Said out loud, because the operator cannot see which halves are on the
            // board from a button. A first-half-only take is a correct graphic and a
            // normal one at the interval; it is only wrong if nobody meant it.
            if (!board.swing) {
                const only = board.halves[0]?.key === 'first' ? 'first' : 'second';
                return {
                    ready: true,
                    data: null,
                    summary: `${totals} — ${only} half only, the other is not recorded`,
                };
            }
            const signed = (value) => (value > 0 ? '+' : '') + value;
            return {
                ready: true,
                data: null,
                summary: `${totals} — second half ${signed(board.swing.home)} / ${signed(board.swing.away)}` +
                    `, ${board.tempo.perMinute}/min`,
            };
        }
        case 'miniStats': {
            const possession = live?.stats?.possession;
            const home = possession?.home ?? 0;
            const away = possession?.away ?? 0;
            // It drops out from under the scorebug, so without the scorebug it is a
            // panel hanging in the gap where the bug should be. `electron/graphics.js`
            // refuses the take outright; this is the same rule said early enough for
            // the operator to see why the button is dark.
            if (hostIsDown(def, onAir)) {
                return {
                    ready: false,
                    data: null,
                    summary: 'Put the scorebug up first — this drops out from under it.',
                };
            }
            // The gate the full board does not have, and the reason it has no bars.
            // Two numbers that sum to nothing cannot be drawn as a proportion of each
            // other: an earlier stats board divided by zero at nil-nil and left the
            // last bar length sitting on air. Refusing to arm is the fix at the only
            // point where refusing costs nothing — a button that stays dark is a
            // graphic nobody had to notice was wrong.
            //
            // Not the same as "no stats held". A row of zeroes is what every fixture
            // looks like before kick-off, so this button is dark for the whole
            // build-up and lights when the first possession figure is typed in.
            if (home + away <= 0) {
                return {
                    ready: false,
                    data: null,
                    summary: live?.stats
                        ? 'No possession figures yet — the bar needs two numbers to split.'
                        : 'No stats held for this match yet.',
                };
            }
            return {
                ready: true,
                data: null,
                summary: `${side(match, live, 'home')} ${home}% – ${away}% ${side(match, live, 'away')}, live while up`,
            };
        }
        case 'teamStats': {
            const possession = live?.stats?.possession;
            if (!live?.stats) {
                return { ready: false, data: null, summary: 'No stats held for this match yet.' };
            }
            return {
                ready: true,
                data: null,
                summary: `Possession ${possession?.home ?? 50}% – ${possession?.away ?? 50}%, live while up`,
            };
        }
        case 'lineup': {
            const counts = { home: namedStarters(lineup, 'home'), away: namedStarters(lineup, 'away') };
            // Per side, because the two are entered separately and one is routinely
            // ready long before the other. Gating both on the pair would hold back a
            // team sheet that is complete and waiting.
            const takes = ['home', 'away'].map((which) => {
                const named = counts[which];
                const team = side(match, live, which);
                return {
                    key: which,
                    label: team,
                    // Taken even when a side is short: the empty rows are drawn as empty
                    // rows, which is the honest picture and gets noticed. Refusing
                    // outright would leave the operator with nothing at all to put up.
                    ready: named > 0,
                    data: { side: which },
                    summary: !named
                        ? `No ${which} lineup held for this match yet.`
                        : named < 11
                            ? `${team} — only ${named} starters entered, the gaps will show`
                            : `${team} — 11 starters`,
                };
            });
            const anything = takes.some((t) => t.ready);
            return {
                ready: anything,
                data: null,
                takes,
                summary: !anything
                    ? 'No lineup held for this match yet.'
                    : takes
                        .filter((t) => t.ready)
                        .map((t) => t.label + ' ' + counts[t.key])
                        .join(' · ') + ' named',
            };
        }
        case 'officials': {
            const named = Object.values(live?.officials ?? {}).filter(Boolean);
            if (!named.length) {
                return { ready: false, data: null, summary: 'No officials recorded for this match.' };
            }
            return {
                ready: true,
                data: null,
                summary: `${named.length} official${named.length === 1 ? '' : 's'}: ${named.join(', ')}`,
            };
        }
        case 'intro': {
            const venue = match.venue ? ` at ${match.venue}` : '';
            return {
                ready: true,
                data: null,
                summary: `${match.homeTeam?.name ?? 'Home'} v ${match.awayTeam?.name ?? 'Away'}${venue}`,
            };
        }
        case 'result': {
            const status = live?.status ?? match.status ?? '';
            const score = `${live?.home?.score ?? 0}–${live?.away?.score ?? 0}`;
            // The template's own map, not a second copy of it: this line's job is to
            // say what will appear, and it can only keep that promise by asking the
            // thing that decides.
            const headline = headlineFor(status);
            return {
                ready: true,
                data: null,
                summary: `${headline} ${score}` +
                    (headline === 'SKOR'
                        ? ` — the app does not recognise the status "${status}", so it names no stage`
                        : ''),
            };
        }
        // --- the league graphics ------------------------------------------------
        //
        // Four graphics, one gate, and no payload between them. They are `live`, so each reads
        // `context.league` at render time the way the passes board reads `stats` — which means
        // arming has exactly one job here: say whether there is a league to draw, and say what
        // it will draw, before anybody puts it on air.
        //
        // The data is not derived here and could not be. It comes from
        // `/api/v1/matches/:matchId/league`, because the FAM snapshot behind it sits under RLS
        // wanting a Supabase session that neither this app nor the render surface holds. So the
        // one thing arming must never do is invent a fallback: a league strap that draws
        // *something* when the league is unknown is the failure this whole tier is shaped to
        // avoid.
        case 'leagueContext':
        case 'miniTable':
        case 'formH2H':
        case 'factCard': {
            const league = context.league;
            if (!league) {
                return {
                    ready: false,
                    data: null,
                    // Two genuinely different reasons and the operator can act on one of them. A cup
                    // tie is nothing to fix; a mapping nobody set is a five-minute job before kickoff.
                    summary: 'No league table for this fixture — a cup tie, a friendly, or a competition FAM is not mapped to.',
                };
            }
            const home = league.homeAfter ?? league.homeBefore;
            const away = league.awayAfter ?? league.awayBefore;
            const stand = `${side(match, live, 'home')} ${home?.position ?? '?'} · ${side(match, live, 'away')} ${away?.position ?? '?'}`;
            if (def.id === 'formH2H') {
                const met = league.h2h.length + league.past.length;
                return {
                    ready: true,
                    data: null,
                    summary: met === 0
                        ? `Form only — these two have no recorded meeting`
                        : `Form, and ${met} previous meeting${met === 1 ? '' : 's'}`,
                };
            }
            if (def.id === 'factCard') {
                const top = league.facts[0];
                return {
                    ready: league.facts.length > 0,
                    data: null,
                    summary: top
                        ? `${league.facts.length} point${league.facts.length === 1 ? '' : 's'} — "${top.headline}"`
                        : 'No talking points could be derived for these two.',
                };
            }
            // The two that carry a position, and the summary says so out loud. `applying` is the
            // difference between a table that is FAM's last word and one this match has already
            // moved, and an operator about to put a position on air should know which they have.
            return {
                ready: true,
                data: null,
                summary: `${stand}${league.applying ? ' — live-adjusted' : ''}`,
            };
        }
        default:
            // A graphic in the manifest that nothing here knows how to arm. It can
            // still be taken; it just goes up on whatever its template makes of an
            // empty payload, which for a `live` feed is everything it needs.
            return { ready: true, data: null, summary: '' };
    }
}
// The arming layer is one entry point on purpose. `eventPool`, `passBoard` and
// `headlineFor` were separate modules in the graphics repo because they were
// imported from separate places there; across a package boundary that is three
// subpaths for one idea, and a consumer would have to know which of them holds
// what.
export * from './events.js';
export * from './passes.js';
export * from './headline.js';
