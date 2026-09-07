// What the scoreline's big label says, by match status.
//
// The league's own words, in the league's own language — the artboard mocks
// full time as "MASA PENUH" and the rest were given to match it.
//
// A module of its own, and a leaf one: it imports nothing. Two things read it —
// the template that draws the headline, and the operator's rack, which prints
// the same line under the TAKE button before the graphic is fired. Keeping it
// here rather than in `Result.tsx` means the rack can be reasoned about without
// pulling in React and the whole render tree behind it, which is what
// `scripts/inspect.js` relies on to report what a fixture *would* put on air
// using the real arming logic instead of a second copy of it.
/**
 * The five statuses an operator can actually reach.
 *
 * They are exactly the web app's own buttons, which are the only thing that
 * moves a match between them:
 *
 *     pre --[Start 1st Half]--> 1h --[Half Time]--> ht
 *         --[Start 2nd Half]--> 2h --[Full Time]--> ft
 */
export const HEADLINE = {
    pre: 'SEPAK MULA',
    '1h': 'SEPARUH MASA PERTAMA',
    ht: 'SEPARUH MASA',
    '2h': 'SEPARUH MASA KEDUA',
    ft: 'MASA PENUH',
};
/**
 * The word for a status, and the only place that decides it.
 *
 * `abandoned` is in the database enum but no button sets it, so it is reachable
 * only by editing the row by hand. It falls through with anything unrecognised
 * to SKOR, which is the one word that is true whatever happened — a headline
 * asserting a stage the app is not sure of is how MASA PENUH ends up over a
 * match still being played.
 */
export const headlineFor = (status) => HEADLINE[status ?? ''] ?? 'SKOR';
