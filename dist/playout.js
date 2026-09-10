// The playout bus. Five layers, ducking, autoOut, seq guards and panic.
//
// **Lifted verbatim from `matchops-graphics/electron/graphics.js` on
// 2026-09-07, changing only `module.exports` to `export`.** It lives here
// because two tiers now need it: the Windows app runs it in its main process,
// and the web tier runs it in a stateless function that loads state, applies one
// command and writes back. A second implementation would drift, and the way that
// drift shows up is a graphic ducking correctly in the .exe and not on air.
//
// Deliberately still plain JavaScript rather than TypeScript. It is the most
// safety-critical file in the broadcast path and it is covered by 155 checks;
// rewriting it under `strict` and `noUncheckedIndexedAccess` to satisfy a build
// would be a refactor wearing a move's clothing. `allowJs` gives the package its
// declarations without touching a line of the logic.
//
// It has no imports, and must not gain any. That property is why the web tier
// runs this and not a port of it.
// The playout bus.
//
// Every graphic is fired by a human. Data fills a template; it never takes one
// to air. A goal that gets chalked off by VAR is rare, but when it happens an
// auto-firing engine has already put the scorer's name on screen — and the
// operator watching the incident knew before the data did. What the data does
// earn is the button lighting up with the payload preloaded, which is the
// useful half of automation with none of the risk.
//
// State lives here rather than in either renderer, for one reason: the render
// window can be reloaded out from under the show by the watchdog. When it comes
// back it asks what is on air and rebuilds it. If the truth lived in the DOM, a
// recovery would silently clear the feed and the operator would find out from
// the programme output.
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
const LAYERS = ['dock', 'topper', 'bug', 'lower', 'full'];
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
const MANIFEST = [
    {
        id: 'scorebug',
        label: 'Scorebug',
        layer: 'bug',
        feed: 'live',
        autoOut: null,
        hides: [],
    },
    {
        id: 'result',
        // Not "HT / FT", which names two of the five things it says. The headline
        // follows the match status through SEPAK MULA, SEPARUH MASA PERTAMA,
        // SEPARUH MASA, SEPARUH MASA KEDUA and MASA PENUH, and falls back to SKOR
        // for anything it does not recognise — see `src/render/headline.ts`. An
        // operator reaching for this at kick-off should not have to work out that
        // the button marked half time is the one that says SEPAK MULA.
        label: 'Scoreline',
        // A lower third, which is what the designer drew. The artboard's own group
        // is `#lower3rd` and every slot on it sits between y=746 and y=1020 — a
        // banner across the bottom quarter, never a full screen. Only this file ever
        // said otherwise, and saying `full` meant taking it cleared the stats board
        // in order to show a strip along the bottom of where the stats board was.
        //
        // Sharing a layer with the three event bars is the point rather than a side
        // effect: this banner spans y=746..1020 and a goal bar spans y=879..985, so
        // they cannot both be on air without one being drawn through the other.
        layer: 'lower',
        feed: 'live',
        // Unlike the event bars, no autoOut. Half time is not something that lasts
        // eight seconds, and the operator decides when the break is over.
        autoOut: null,
        // Still ducks the bug, and not because they collide — the bug is top-left
        // and this is along the bottom. The banner restates the scoreline, and the
        // same score in two places reads as a fault in the graphics rather than as
        // emphasis.
        hides: ['bug'],
    },
    {
        id: 'goal',
        label: 'Goal',
        layer: 'lower',
        feed: 'frozen',
        autoOut: 8_000,
        hides: [],
    },
    {
        id: 'card',
        label: 'Card',
        layer: 'lower',
        feed: 'frozen',
        autoOut: 7_000,
        hides: [],
    },
    {
        id: 'substitution',
        label: 'Substitution',
        layer: 'lower',
        feed: 'frozen',
        // Longer than a goal: there are two names to read, and the viewer is not
        // being told which one to look at.
        autoOut: 9_000,
        hides: [],
    },
    {
        id: 'passes',
        // "Passes" in the rack and HANTARAN on air, the way the possession panel is
        // "Possession" and PENGUASAAN. Never HANTARAN TEPAT or HANTARAN BERJAYA:
        // both promise an attempt/success split that the column these come from does
        // not have, so either label would be putting an invented number on air. The
        // stats operator said so directly and `graphics:check` holds it.
        label: 'Passes',
        // A lower third by geometry and by mutual exclusion. It spans the bottom
        // band, so it and a goal bar cannot both be on air — which is exactly what a
        // layer is for. It is not on the `dock` beside the possession panel for a
        // reason that is about the data rather than the space: possession % *is* the
        // pass share, derived from these same counts, so the two side by side draw
        // one fact twice and quietly explain that the league's possession figure is
        // not time on the ball.
        layer: 'lower',
        // Live, like the board and unlike the event bars. The counts arrive when a
        // person types them — the second half lands at full time — and a board that
        // froze at take would be showing a half that has since been keyed in.
        feed: 'live',
        // The possession panel's hold, for the possession panel's reason: a chart is
        // read rather than glanced at. Still finite, because it shares this layer
        // with the graphics an operator fires on reflex, and a stats board left up is
        // a goal bar that cannot be taken.
        autoOut: 12_000,
        // Nothing. The bug is top-left, this is along the bottom, and it restates
        // nothing the bug says — unlike the scoreline, which ducks the bug precisely
        // because it repeats the score.
        hides: [],
    },
    {
        id: 'leagueContext',
        // "League" in the rack; the artwork says KEDUDUKAN LIGA. Same split as Passes/HANTARAN.
        label: 'League',
        // A lower third by geometry and by mutual exclusion, and the exclusion is the point:
        // this and the mini-table are two readings of the same table, and two league straps on
        // screen at once would invite a viewer to compare them and find them saying different
        // things at different moments of a goal being applied.
        layer: 'lower',
        // `live`, not `frozen`, and this is the opposite call from the goal bar. A goal bar must
        // not rewrite itself mid-animation because a later event landed. A league strap must
        // follow the score — its whole claim is "where these two stand", and a strap still
        // showing the pre-goal points thirty seconds after the goal is simply wrong.
        feed: 'live',
        // Long enough to read two clubs' records and the disclaimer under them. The passes board
        // holds twelve for four numbers; this has more words and no less to say.
        autoOut: 12_000,
        hides: [],
    },
    {
        id: 'miniTable',
        label: 'Mini table',
        layer: 'lower',
        feed: 'live',
        autoOut: 12_000,
        hides: [],
    },
    {
        id: 'miniStats',
        label: 'Possession',
        // Docked under the bug rather than banded across the bottom of the frame.
        // A full-width strip is what this looked like first, and it read as a piece
        // of furniture from another decade — the possession panel every league
        // draws now drops out from under the scoreboard, because that is where the
        // viewer is already looking and it costs no part of the picture.
        layer: 'dock',
        // Which makes it the bug's, not its own. See `attachedTo` below.
        attachedTo: 'scorebug',
        // Live, like the board and unlike the three event bars. A frozen possession
        // split is wrong within a minute of being taken, and this one is meant to
        // sit over play rather than punctuate it.
        feed: 'live',
        // Longer than a substitution, because a bar is read rather than glanced at,
        // and still finite — unlike the scoreline this is a moment, not a state,
        // and it shares the layer with the graphics an operator fires on reflex. A
        // possession bar left up is a goal bar that cannot be taken.
        autoOut: 12_000,
        // Nothing, and it needs nothing: it ducks with the bug automatically, which
        // is one of the three rules `attachedTo` carries. A full screen that says it
        // hides the bug takes this with it without naming it.
        hides: [],
    },
    {
        id: 'addedTime',
        label: 'Added time',
        // Above the clock rather than beside it, because beside it there is no room:
        // the bug's silhouette leaves a clear rectangle 28px tall to the right of
        // the clock cap and 33px above it. Measured off `shots/scorebug.png`, and
        // the reason the tab is the size it is.
        layer: 'topper',
        attachedTo: 'scorebug',
        // The one graphic here whose payload is neither derived nor looked up. The
        // fourth official raises a board and the operator reads it; no field in the
        // feed carries that number, and none should — it is a decision taken on the
        // touchline forty seconds before it is shown.
        feed: 'frozen',
        // None, and this is the same call the scoreline makes for the same reason:
        // added time is a state, not a moment. The event bars punctuate the match
        // and take themselves off; three minutes of added time is true until the
        // half ends. A tab that vanished at 90:05 with five minutes still to play
        // is the worse failure, and the operator already has Clear.
        autoOut: null,
        hides: [],
        // Fired from beside the clock, not from the rack.
        firedFrom: 'clock',
    },
    {
        id: 'teamStats',
        label: 'Team stats',
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
    },
    {
        id: 'intro',
        label: 'Match intro',
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
        group: 'prematch',
    },
    {
        id: 'lineup',
        label: 'Starting XI',
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
        group: 'prematch',
    },
    {
        id: 'officials',
        label: 'Officials',
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
        group: 'prematch',
    },
    {
        id: 'formH2H',
        label: 'Form & H2H',
        // A full screen because it is two lists, not a strap: five results a side and however
        // many previous meetings there are. Squeezed into the bottom band it would be a table
        // nobody can read at broadcast bitrates.
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
        // Build-up, so the rack folds it away once the clock starts. Form and head-to-head are
        // what a commentator sets a match up with; neither is news once it is under way.
        group: 'prematch',
    },
    {
        id: 'factCard',
        label: 'Match facts',
        layer: 'full',
        feed: 'live',
        autoOut: null,
        hides: ['bug'],
        group: 'prematch',
    },
];
const byId = (id) => MANIFEST.find((g) => g.id === id) || null;
/**
 * One entry per layer, or null.
 *
 * Built from `LAYERS` rather than written out again. The list above already
 * says what the layers are, and a second copy is a place to add a layer and
 * forget — which had already happened: `dock` was missing here and only worked
 * because assigning to an absent key adds it, so between boot and the first
 * possession take the state carried four layers and reported no `dock` at all.
 */
const layers = Object.fromEntries(LAYERS.map((layer) => [layer, null]));
/** What the render window says it is actually doing, keyed by graphic id. */
const actual = {};
/**
 * The graphic ids the render window says it can actually draw, reported once at
 * boot. Null until it has.
 *
 * This is the drift check. The manifest lives here and the components live
 * there, and nothing in the type system connects them — a graphic added to one
 * and forgotten in the other would take to air as an empty layer, which is a
 * discovery to make at boot rather than at kickoff.
 */
let known = null;
/** Bumped on every change so a renderer can tell a new take from a re-push. */
let seq = 0;
/** Set by a panic, and read by the render window as "unmount, do not animate". */
let panicSeq = null;
/** Auto-out timers, keyed by graphic id. */
const timers = new Map();
/**
 * Whether `autoOut` is served by a timer here, or left to whoever reads the
 * state. True for the app, where one process owns the bus for the life of a
 * match. `hydrate()` turns it off for the web tier, whose bus is a function
 * that exits between takes — see the note there.
 */
let timersEnabled = true;
let notify = () => { };
function clearTimer(id) {
    const timer = timers.get(id);
    if (timer)
        clearTimeout(timer);
    timers.delete(id);
}
/** Whether a graphic is the one currently occupying its own layer. */
const onAir = (def) => Boolean(def && layers[def.layer]?.id === def.id);
/** The graphics that hang off this one. See `attachedTo` in the manifest. */
const docked = (id) => MANIFEST.filter((entry) => entry.attachedTo === id);
/**
 * Which layers are ducked right now. Derived rather than stored: a stored copy
 * is one more thing that can disagree with the graphic that caused it.
 */
function suppressed() {
    const hidden = new Set();
    for (const layer of LAYERS) {
        const entry = layers[layer];
        if (!entry)
            continue;
        for (const target of byId(entry.id)?.hides || [])
            hidden.add(target);
    }
    // A docked panel ducks whenever the graphic it hangs off ducks — the second
    // of the three rules `attachedTo` carries. Derived here rather than written
    // into each full screen's `hides`, because five lists kept in step by hand is
    // five chances to forget the one that was added last, and the way that fails
    // is a possession panel sitting on top of the team sheet.
    for (const layer of LAYERS) {
        const entry = layers[layer];
        if (!entry)
            continue;
        const def = byId(entry.id);
        const host = def?.attachedTo ? byId(def.attachedTo) : null;
        if (host && hidden.has(host.layer))
            hidden.add(def.layer);
    }
    return [...hidden];
}
/** Manifest entries the render window has no component for. Empty is the only good answer. */
const missing = () => (known ? MANIFEST.filter((g) => !known.includes(g.id)).map((g) => g.id) : []);
const state = () => ({
    seq,
    panicSeq,
    layers: { ...layers },
    suppressed: suppressed(),
    actual: { ...actual },
    missing: missing(),
});
function announce() {
    notify('graphics:state', state());
}
/**
 * Put a graphic on air.
 *
 * The payload travels with the take rather than being looked up here. That is
 * what lets an operator fire a graphic while the uplink is down: whatever was
 * in the mirror when they pressed the button is what goes to air, and the main
 * process needs to know nothing about the shape of it.
 */
function take(id, data) {
    const def = byId(id);
    if (!def)
        return { ok: false, error: `No graphic named ${id}`, reason: 'invalid' };
    // Refusing beats taking an empty layer to air. Only checked once the render
    // window has reported in — before that, nothing is known either way.
    if (known && !known.includes(id)) {
        return { ok: false, error: `No template for ${id} in the render window`, reason: 'invalid' };
    }
    // A docked panel cannot be on air without the graphic it hangs off. It is
    // drawn against that graphic's bottom edge, so alone it is a panel floating
    // in the gap where the scorebug should be. Refused here rather than only in
    // the rack: the rack is one caller, and this is a rule about the graphic.
    if (def.attachedTo) {
        const host = byId(def.attachedTo);
        if (!onAir(host)) {
            return {
                ok: false,
                error: `${def.label} hangs off the ${host ? host.label.toLowerCase() : def.attachedTo}, which is not on air`,
                reason: 'invalid',
            };
        }
    }
    // Replacing a graphic on the same layer cancels its timer, or the old
    // graphic's auto-out would clear the new one early.
    const replaced = layers[def.layer];
    if (replaced)
        clearTimer(replaced.id);
    clearTimer(id);
    seq += 1;
    const entry = {
        id,
        seq,
        data: data ?? null,
        takenAt: Date.now(),
        autoOutAt: def.autoOut ? Date.now() + def.autoOut : null,
    };
    layers[def.layer] = entry;
    if (def.autoOut && timersEnabled) {
        // Captured by seq: if the operator re-takes before this fires, the timer
        // belongs to a graphic that is no longer on air and must do nothing.
        const firedFor = entry.seq;
        timers.set(id, setTimeout(() => {
            const current = layers[def.layer];
            if (current && current.seq === firedFor)
                clear(id);
        }, def.autoOut));
    }
    console.log(`[graphics] take ${id} (${def.layer})${replaced ? ` over ${replaced.id}` : ''}`);
    announce();
    return { ok: true, state: state() };
}
/** Take it off air. The render window animates out and reports when it is gone. */
function clear(id) {
    const def = byId(id);
    if (!def)
        return { ok: false, error: `No graphic named ${id}`, reason: 'invalid' };
    clearTimer(id);
    if (layers[def.layer]?.id !== id)
        return { ok: true, state: state() };
    seq += 1;
    layers[def.layer] = null;
    console.log(`[graphics] clear ${id}`);
    // And anything docked to it goes too. A panel drawn against the bottom edge
    // of a graphic that is no longer there is a panel hanging in space, and the
    // operator who cleared the bug was not asked a question about the panel.
    for (const child of docked(id)) {
        if (layers[child.layer]?.id !== child.id)
            continue;
        clearTimer(child.id);
        layers[child.layer] = null;
        console.log(`[graphics] clear ${child.id} (docked to ${id})`);
    }
    announce();
    return { ok: true, state: state() };
}
/**
 * Everything off, now.
 *
 * Deliberately without out-animations. Panic is pressed when something is wrong
 * on air, and if the thing that is wrong is the animation, an animated exit
 * never completes and the graphic stays up. The one operation that must always
 * work cannot depend on the machinery it exists to escape.
 */
function panic() {
    for (const id of timers.keys())
        clearTimer(id);
    for (const layer of LAYERS)
        layers[layer] = null;
    seq += 1;
    panicSeq = seq;
    console.warn('[graphics] PANIC CLEAR — everything off, no exit animations');
    announce();
    return { ok: true, state: state() };
}
/**
 * The render window reporting what it is actually doing.
 *
 * Kept separate from the desired state on purpose: "the operator took it" and
 * "it is on screen" are different claims, and the gap between them is where a
 * broken template shows up. The control window shows both.
 */
/** The render window declaring what it can draw. See `known`. */
function templates(ids) {
    known = Array.isArray(ids) ? ids : [];
    const gap = missing();
    if (gap.length) {
        console.error(`[graphics] the render window has no template for: ${gap.join(', ')} — ` +
            'taking one would put an empty layer on air');
    }
    announce();
}
function phase(id, value) {
    if (value === 'out')
        delete actual[id];
    else
        actual[id] = value;
    announce();
}
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
function hydrate(next, { timers: useTimers = false } = {}) {
    for (const id of timers.keys())
        clearTimer(id);
    timersEnabled = useTimers;
    const incoming = next && typeof next === 'object' ? next : {};
    const incomingLayers = incoming.layers && typeof incoming.layers === 'object' ? incoming.layers : {};
    for (const layer of LAYERS)
        layers[layer] = incomingLayers[layer] ?? null;
    for (const id of Object.keys(actual))
        delete actual[id];
    Object.assign(actual, incoming.actual && typeof incoming.actual === 'object' ? incoming.actual : {});
    seq = Number.isFinite(incoming.seq) ? incoming.seq : 0;
    panicSeq = Number.isFinite(incoming.panicSeq) ? incoming.panicSeq : null;
    if (useTimers) {
        for (const layer of LAYERS) {
            const entry = layers[layer];
            if (!entry || !entry.autoOutAt)
                continue;
            const firedFor = entry.seq;
            const id = entry.id;
            timers.set(id, setTimeout(() => {
                const current = layers[layer];
                if (current && current.seq === firedFor)
                    clear(id);
            }, Math.max(0, entry.autoOutAt - Date.now())));
        }
    }
    return state();
}
function reset() {
    for (const id of timers.keys())
        clearTimer(id);
    timersEnabled = true;
    for (const layer of LAYERS)
        layers[layer] = null;
    for (const id of Object.keys(actual))
        delete actual[id];
    seq += 1;
    panicSeq = seq;
    announce();
}
function attach(emit) {
    notify = emit || (() => { });
}
function stop() {
    for (const id of timers.keys())
        clearTimer(id);
    notify = () => { };
}
export { LAYERS, MANIFEST, byId, state, take, clear, panic, phase, templates, reset, hydrate, attach, stop, };
