/**
 * Layers, from back to front. A layer holds at most one graphic, so taking one
 * replaces whatever was there — two lower thirds cannot occupy the same strip
 * of screen, which is the overlap that looks worst and is easiest to cause.
 *
 * `dock` and `topper` are behind the bug and hold what hangs off it — the
 * possession panel below its bottom edge, added time above its clock. They are
 * layers of their own rather than part of the scorebug because a panel the
 * operator drops and retracts a dozen times a match would otherwise replay the
 * bug's entrance on every one of those, and the bug goes up at kickoff and is
 * meant to stay put.
 *
 * Two layers rather than one holding both, and that is not a formality. A layer
 * means mutual exclusion, and these two do not exclude each other: one hangs
 * below the bug and the other sits above its clock, so they can never overlap.
 * On one layer, signalling three minutes of added time would silently retract
 * the possession bar — a graphic going off air because of a graphic it does not
 * touch, which is the exact thing layers exist to prevent.
 */
export const LAYERS: string[];
/**
 * What exists. Adding a graphic is a line here plus a component in
 * `src/render/templates/` — the renderers read this list over IPC rather than
 * keeping their own copy, so the two cannot drift.
 *
 * `feed`:
 *   `live`   — re-renders as the mirror changes. The scorebug must follow the
 *              score without being re-taken.
 *   `frozen` — the payload is captured at take and never changes. A goal lower
 *              third must not rewrite itself mid-animation because a later
 *              event landed.
 *
 * `autoOut` — milliseconds until it clears itself, timed from the take. Null
 *             means it stays until the operator clears it.
 *
 * `hides`   — layers this graphic ducks while it is on air. They come back on
 *             their own; they are not cleared, or the operator would have to
 *             re-take the scorebug after every full-screen.
 *
 * `firedFrom` — where the operator's trigger lives, for the graphics whose
 *             trigger is not a rack row. Absent on all but one. Added time
 *             carries a number the feed does not have and cannot have, so its
 *             button sits beside the field where that number is typed; a rack
 *             row for it would be a second way to fire the same graphic, and
 *             the worse of the two, because it could only ever send whatever
 *             number happened to be set elsewhere.
 *
 * Ordered by layer, which is also roughly the order an operator reaches for
 * them: the bug goes up at kickoff and stays, the lower thirds punctuate the
 * match, the full screens bracket it.
 *
 * The scoreline leads the lower thirds rather than sitting with the event bars.
 * It is
 * the only one of the four an operator goes looking for — a goal or a card is
 * fired in the second after it happens, from muscle memory, while half time is
 * a moment where somebody stops and reads the rack.
 *
 * `group` marks the ones that belong to the build-up rather than to the match.
 * The rack collects them into one collapsible block and folds it away when the
 * clock starts, so what is left on screen is what an operator can still use.
 * A property of the graphic rather than a list held in the control window: when
 * a graphic is useful is as much a fact about it as which layer it occupies, and
 * a list over there would be a second place to forget.
 */
export const MANIFEST: ({
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: null;
    hides: string[];
    attachedTo?: undefined;
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: number;
    hides: never[];
    attachedTo?: undefined;
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    attachedTo: string;
    feed: string;
    autoOut: number;
    hides: never[];
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    attachedTo: string;
    feed: string;
    autoOut: null;
    hides: never[];
    firedFrom: string;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: null;
    hides: string[];
    group: string;
    attachedTo?: undefined;
    firedFrom?: undefined;
})[];
export function byId(id: any): {
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: null;
    hides: string[];
    attachedTo?: undefined;
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: number;
    hides: never[];
    attachedTo?: undefined;
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    attachedTo: string;
    feed: string;
    autoOut: number;
    hides: never[];
    firedFrom?: undefined;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    attachedTo: string;
    feed: string;
    autoOut: null;
    hides: never[];
    firedFrom: string;
    group?: undefined;
} | {
    id: string;
    label: string;
    layer: string;
    feed: string;
    autoOut: null;
    hides: string[];
    group: string;
    attachedTo?: undefined;
    firedFrom?: undefined;
} | null;
export function state(): {
    seq: number;
    panicSeq: any;
    layers: {
        [k: string]: null;
    };
    suppressed: any[];
    actual: {};
    missing: string[];
};
/**
 * Put a graphic on air.
 *
 * The payload travels with the take rather than being looked up here. That is
 * what lets an operator fire a graphic while the uplink is down: whatever was
 * in the mirror when they pressed the button is what goes to air, and the main
 * process needs to know nothing about the shape of it.
 */
export function take(id: any, data: any): {
    ok: boolean;
    error: string;
    reason: string;
    state?: undefined;
} | {
    ok: boolean;
    state: {
        seq: number;
        panicSeq: any;
        layers: {
            [k: string]: null;
        };
        suppressed: any[];
        actual: {};
        missing: string[];
    };
    error?: undefined;
    reason?: undefined;
};
/** Take it off air. The render window animates out and reports when it is gone. */
export function clear(id: any): {
    ok: boolean;
    error: string;
    reason: string;
    state?: undefined;
} | {
    ok: boolean;
    state: {
        seq: number;
        panicSeq: any;
        layers: {
            [k: string]: null;
        };
        suppressed: any[];
        actual: {};
        missing: string[];
    };
    error?: undefined;
    reason?: undefined;
};
/**
 * Everything off, now.
 *
 * Deliberately without out-animations. Panic is pressed when something is wrong
 * on air, and if the thing that is wrong is the animation, an animated exit
 * never completes and the graphic stays up. The one operation that must always
 * work cannot depend on the machinery it exists to escape.
 */
export function panic(): {
    ok: boolean;
    state: {
        seq: number;
        panicSeq: any;
        layers: {
            [k: string]: null;
        };
        suppressed: any[];
        actual: {};
        missing: string[];
    };
};
export function phase(id: any, value: any): void;
/**
 * The render window reporting what it is actually doing.
 *
 * Kept separate from the desired state on purpose: "the operator took it" and
 * "it is on screen" are different claims, and the gap between them is where a
 * broken template shows up. The control window shows both.
 */
/** The render window declaring what it can draw. See `known`. */
export function templates(ids: any): void;
export function reset(): void;
/**
 * Called when a match is unbound. Graphics carry match data, so leaving them up
 * across a switch is how a lineup from the first fixture of a double-header
 * ends up over the second.
 */
/**
 * Restore state that another process produced.
 *
 * The app never needs this: one main process owns the bus for the life of the
 * app, so `state()` is always the truth it just produced. The web tier has no
 * main process — a take arrives at a stateless function which has to load what
 * is on air, apply one command and write back. Without this the reducer would
 * start from an empty stage every time, and the first take of a match would
 * silently clear whatever was already up.
 *
 * **`timers` defaults to false, and that is the half that matters.** `take()`
 * schedules a `setTimeout` for `autoOut`, which is correct where the process
 * outlives the graphic and meaningless where it is about to exit — the callback
 * would either never run or hold the invocation open for nothing. Every entry
 * already carries `autoOutAt`, so a reader expires it locally and the answer is
 * the same everywhere without a timer existing at all. Pass `timers: true` only
 * from something that will still be running when they fire; pending outs are
 * then rescheduled from the time remaining, not from the full duration, so a
 * graphic restored with two seconds left leaves in two seconds.
 *
 * Deliberately does not announce. Loading what is already on air is not a
 * change to it, and a subscriber told otherwise would re-animate the running
 * show — the same reason the render window adopts the first state it is given
 * rather than acting on it.
 */
export function hydrate(next: any, { timers: useTimers }?: {
    timers?: boolean | undefined;
}): {
    seq: number;
    panicSeq: any;
    layers: {
        [k: string]: null;
    };
    suppressed: any[];
    actual: {};
    missing: string[];
};
export function attach(emit: any): void;
export function stop(): void;
