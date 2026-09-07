// Reading the pass counts, for everything that draws a fact from them.
//
// Same shelf as `src/events.ts` and for the same reason: the graphic runs in the
// render window and the rack runs in the control window, and neither may import
// from the other. The rules below are one set of rules — what counts as
// recorded, which halves may be drawn, what every bar is measured against — and
// they have to be the same on both sides of the app or the operator is told one
// thing by a button and shown another on air.
//
// The arithmetic upstream of this is in `electron/passes.js`, which sums the
// database column. This is downstream of the wire: it takes the shaped `stats`
// resource and works out what a graphic may draw from it.
/** The league's own words, matching the register on `src/render/headline.ts`. */
const HALF_LABEL = {
    first: 'SEPARUH PERTAMA',
    second: 'SEPARUH KEDUA',
};
/** Minutes in a half, for the tempo divisor. Stoppage time is not counted. */
export const MINUTES_PER_HALF = 45;
const count = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
/**
 * What a graphic may draw, or null when the answer is nothing.
 *
 * **Zero means not recorded, not zero passes.** That is the rule this file
 * exists to hold, and it comes from the shape of the operator's day rather than
 * from the data: the counts are typed into the stats tab, the second half is not
 * entered until full time, and a match nobody kept counts on sends 0 across every
 * field. A football match with no passes in it has never been played, so a nought
 * on this board can only ever mean the column is empty.
 *
 * So: a half whose two counts sum to nothing is left out entirely, and a match
 * with no recorded half returns null. Drawing an unrecorded half as an even split
 * — two bars of the same length, which is what a naive share would produce — is
 * the specific failure being prevented. At half time that would put a completely
 * invented second half on air beside a real first one.
 */
export function passBoard(stats) {
    const s = stats?.stats;
    if (!s)
        return null;
    const halves = [];
    const add = (key, pair) => {
        const home = count(pair?.home);
        const away = count(pair?.away);
        if (home + away === 0)
            return;
        halves.push({
            key,
            label: HALF_LABEL[key],
            home,
            away,
            share: home + away > 0 ? home / (home + away) : 0.5,
        });
    };
    add('first', s.passesFirstHalf);
    add('second', s.passesSecondHalf);
    if (!halves.length)
        return null;
    // Summed from the halves rather than read off `passes`, which is the same
    // number by construction — the server sums the same column into it. Adding the
    // halves keeps the total honest against what is actually on screen: a board
    // showing one half must not carry a total that includes a half it is not
    // drawing, which is exactly what would reach air at half time if a match had
    // been keyed in out of order.
    const match = halves.reduce((total, half) => ({ home: total.home + half.home, away: total.away + half.away }), { home: 0, away: 0 });
    const first = halves.find((half) => half.key === 'first');
    const second = halves.find((half) => half.key === 'second');
    const minutes = halves.length * MINUTES_PER_HALF;
    const perMinute = Math.round(((match.home + match.away) / minutes) * 10) / 10;
    return {
        halves,
        match,
        tempo: { perMinute, minutes },
        swing: first && second
            ? { home: second.home - first.home, away: second.away - first.away }
            : null,
    };
}
