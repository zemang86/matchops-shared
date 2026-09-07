import type { StatsData } from './domain.js';
export interface PassHalf {
    key: 'first' | 'second';
    /** What the graphic draws in the waist of that half's bar. */
    label: string;
    home: number;
    away: number;
    /**
     * The home side's part of this half's bar, 0..1.
     *
     * Normalised against the pair's own total rather than trusted to sum to 100,
     * which is the possession panel's rule and it applies here for the same
     * reason: these are typed in by a person during a match. A pair that does not
     * add up draws slightly wrong instead of running off the end of the bar.
     *
     * A half is only on the board at all when its two counts sum above zero, so
     * this cannot divide by zero — but it is still written as a guard, because the
     * feed is live and a stats row can be edited back to nothing under a board
     * that is already up.
     */
    share: number;
}
export interface PassBoard {
    /**
     * The halves that were actually recorded, in playing order. One entry at half
     * time, two at full time, and never an entry for a half nobody has keyed in.
     */
    halves: PassHalf[];
    match: {
        home: number;
        away: number;
    };
    /**
     * The second half against the first, per side. Null unless both were recorded.
     *
     * This is the story the number tells — the only stat in the pack that shows a
     * shift *within* a match rather than a total. It is a difference of two counts
     * and nothing more: no rate, no projection, and nothing that implies either
     * half was played at a standard.
     */
    swing: {
        home: number;
        away: number;
    } | null;
    /**
     * How fast the match was played: both sides' passes, per minute.
     *
     * **Combined, and that is the only version of this figure worth drawing.** A
     * per-team rate is that team's total divided by a constant, and a per-half
     * rate is that half's bar divided by a constant — both are already on the
     * board, rescaled, and neither tells anyone anything the bars do not. This one
     * is the only number here that means something *across* matches: 8 a minute is
     * a different game from 5 a minute, and nothing else on this board can be
     * compared to last week.
     *
     * **`minutes` is 45 per recorded half, not a flat 90.** Dividing a first-half
     * board by 90 would halve the rate and put a slow match on air over a fast
     * one. It matches the web app's nominal 90 exactly once both halves are in,
     * which is the point — the same match must not read differently on the website
     * and on the feed.
     *
     * It is an approximation and the only figure here that is not a count:
     * stoppage time is not in the divisor, so a match with eight minutes added
     * reads a few percent high. That is the web app's own arithmetic and the
     * reason to keep it rather than invent a better one — a second, more accurate
     * rate would just be two numbers disagreeing.
     */
    tempo: {
        perMinute: number;
        minutes: number;
    };
}
/** Minutes in a half, for the tempo divisor. Stoppage time is not counted. */
export declare const MINUTES_PER_HALF = 45;
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
export declare function passBoard(stats: StatsData | null | undefined): PassBoard | null;
