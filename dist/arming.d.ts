import type { GraphicDef, LiveData, RenderContext } from './domain.js';
export interface Armed {
    /** False disables TAKE. `summary` then says why. */
    ready: boolean;
    data: unknown;
    /** One line: what will appear, or what is missing. Shown under the button. */
    summary: string;
    /**
     * More than one way to fire this graphic, when it has one.
     *
     * The team sheet is one design taken per side, so it is one graphic with two
     * triggers rather than two graphics — the artwork, the layout and the
     * storyboard are identical and only the payload differs. Splitting it into two
     * manifest entries would have meant two ids for one template and a `data-graphic`
     * attribute that agreed with neither.
     *
     * Absent on everything else, and the rack draws its single button as before.
     */
    takes?: Take[];
}
/** One trigger on a graphic that has more than one. */
export interface Take {
    /** Stable across renders, and what the rack matches against what is on air. */
    key: string;
    /** On the button itself, so it has to be short. */
    label: string;
    ready: boolean;
    data: unknown;
    /** Shown when this trigger is the one being pointed at. */
    summary: string;
}
/**
 * The last thing that happened in the match, whatever kind of thing it was.
 *
 * Every other reader here asks for the most recent event *of a type*, because
 * it is arming a particular graphic. This one arms nothing — it answers "what
 * just happened", which is the question the operator is asking a second before
 * they reach for a graphic, and which the rack can only answer by being read
 * nine rows at a time.
 */
export declare function latestEvent(live: LiveData | null): {
    kicker: string;
    minute: string;
    who: string;
    team: string;
} | null;
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
export declare const hostIsDown: (def: GraphicDef, onAir?: Set<string>) => boolean;
export declare function arm(def: GraphicDef, context: RenderContext, onAir?: Set<string>): Armed;
export * from './events.js';
export * from './passes.js';
export * from './headline.js';
