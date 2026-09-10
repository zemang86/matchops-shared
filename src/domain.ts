// The domain model. What a match, a live feed, a team sheet and a graphic are.
//
// Moved here from `matchops-graphics/src/types.ts` on 2026-09-07 because the
// arming logic came with it, and arming is now needed by both tiers: the .exe
// builds a payload in its control window, and the web tier builds the same
// payload in a function. A second copy of these shapes is how the two stop
// agreeing about what goes on air.
//
// Type-only, no runtime, no imports. A few entries here are shaped by the
// desktop app rather than the domain — `LicenceSession`, `RenderHealth`,
// `HeldResource`. They came along rather than being picked apart mid-move, and
// should leave the moment a second consumer disagrees with them.

/** Shapes returned by GET /api/v1/matches. Mirrors netlify/functions/matches-list.ts. */

export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  /** 1024px PNG on Supabase storage. Fine in the control window, never on air. */
  badgeUrl: string;
  /** A proxy for "badges were ever uploaded" — the download at selection is the real check. */
  hasBadge: boolean;
  /**
   * The colour to draw for this club in **this fixture**, resolved server-side
   * from the operator's kit selection. Uppercase #RRGGBB, or null where the
   * league has issued no colour — a real state, not a missing one.
   *
   * This is the one a graphic uses. Which of a club's two kits it came from is
   * not derivable: an away side changes strip only when it clashes, and nothing
   * in the data says whether it did, so somebody decides per fixture and the API
   * answers with the result.
   */
  kitHex: string | null;
  /** Which of the club's two kits `kitHex` came from, for a UI that says so. */
  kitSide: 'home' | 'away' | null;
  /**
   * The club's own two kits, regardless of fixture. Not what a graphic draws —
   * they are here for a picker that previews both.
   */
  homeJerseyHex: string | null;
  /** As above. Null where the league has issued none. */
  awayJerseyHex: string | null;
  /**
   * The same badge served from local disk, added by the main process once it is
   * cached. Null until then. **This is the only one a graphic may use** — a
   * remote badge disappears from air the moment the venue uplink drops.
   */
  localBadgeUrl?: string | null;
}

export interface Competition {
  id: string;
  name: string;
  season: string | null;
}

/** `pre | 1h | ht | 2h | ft` in practice; typed loosely so a new status cannot crash the picker. */
export type MatchStatus = string;

export interface Match {
  id: string;
  kickoffAt: string | null;
  status: MatchStatus | null;
  venue: string | null;
  competition: Competition | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
}

export interface LicenceSession {
  orgId: string;
  scopes: string[];
  expiresAt: string;
  /** Set when running on a cached token because renewal failed. Never fatal on its own. */
  warning: string | null;
}

/** The three per-match resources the mirror holds. */
export type ResourceName = 'live' | 'stats' | 'lineup' | 'match' | 'league';

export interface HeldResource {
  data: unknown;
  etag: string | null;
  fetchedAt: string;
}

/**
 * `live` — the mirror is current.
 * `degraded` — something is failing, or the licence is on a cached session.
 *   Graphics are unaffected; the operator should know before it gets worse.
 * `offline` — nothing is getting through. Last-known state still renders.
 */
export type ConnectionState = 'live' | 'degraded' | 'offline';

export interface Connection {
  state: ConnectionState;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  licenceWarning: string | null;
  matchId: string | null;
  resources: Partial<Record<ResourceName, { fetchedAt: string } | null>>;
}

export interface AssetReport {
  total: number;
  cached: number;
  bytes: number;
  missing: Array<{ label: string; reason: string }>;
}

export interface SelectReport {
  /** Resources on disk and therefore renderable offline. */
  held: number;
  total: number;
  /** How many differed from what was already cached. Zero is normal on re-selection. */
  changed: number;
  missing: ResourceName[];
  assets: AssetReport;
  connection: Connection;
}

export interface DataChange {
  matchId: string;
  name: ResourceName;
  data: unknown;
  fetchedAt: string;
}

/**
 * Liveness of the render window.
 *
 * Needed because the overlay paints only on damage: from OBS's side a hung or
 * crashed renderer looks exactly like an idle one, since Spout keeps serving
 * the last texture either way. A frozen scorebug showing the wrong score is
 * worse than a blank one, and nothing in the output would say so.
 */
export interface RenderHealth {
  lastAliveAt: number | null;
  stalled: boolean;
  /** Set when the renderer process died outright rather than merely hanging. */
  gone: string | null;
  recoveries: number;
  lastRecoveryAt: string | null;
  /** True once reloading has stopped helping and the feed is left frozen. */
  givenUp: boolean;
  msSinceAlive: number | null;
}

/* --- the data the templates render ---------------------------------------- */

/**
 * The `live` resource, as the server sends it. Mirrors `transformToVmixLive` in
 * the web repo's `vmixTransformers.ts`.
 *
 * Every field is optional. A template that assumes a field is present is one
 * schema change away from putting a broken plate on air, and the whole point of
 * the local mirror is that whatever is held keeps rendering.
 */
export interface LiveEvent {
  type?: string;
  minute?: number;
  player?: string;
  /**
   * The same name at several lengths, longest first, from `shape.nameForms`.
   *
   * `player` is what the server's vMix path sends and does not move; this is
   * the app's addition, and it exists because only the renderer knows how wide
   * the bar it is going on happens to be. The last entry is always `player`.
   */
  playerForms?: string[];
  playerNumber?: number;
  team?: 'home' | 'away';
  teamName?: string;
  teamShort?: string;
  relatedPlayer?: string;
  relatedPlayerForms?: string[];
  relatedPlayerNumber?: number;
}

export interface LiveSide {
  name?: string;
  short?: string;
  score?: number;
  /** Pre-formatted by the server, e.g. `SMITH 23', 67'`. */
  scorers?: string[];
}

export interface LiveStatPair {
  home?: number;
  away?: number;
}

export interface LiveData {
  matchId?: string;
  status?: string;
  kickoffDate?: string;
  kickoffTime?: string;
  venue?: string;
  competition?: string;
  season?: string;
  home?: LiveSide;
  away?: LiveSide;
  lastEvent?: LiveEvent;
  /**
   * Every event on the match, oldest first.
   *
   * Optional because it is not always present: a build reading a deploy that
   * sends only `lastEvent` falls back to that one event and keeps the narrower
   * behaviour, rather than losing the card and substitution graphics entirely.
   */
  events?: LiveEvent[];
  stats?: {
    possession?: LiveStatPair;
    shots?: { home?: { total?: number; on?: number }; away?: { total?: number; on?: number } };
    /**
     * Always 0, and not because the number does not exist.
     *
     * The counts are in `match_stats.possession_counts` and reach the app on the
     * `stats` resource — `StatsData.passes` below, with both halves beside it.
     * They are zero *here* because the deployed `vmix-live` reads `stats.passes`,
     * a key nothing writes, and this payload is held byte-for-byte against that
     * endpoint by `equivalence:check`. Draw from `StatsData`.
     */
    passes?: LiveStatPair;
    corners?: LiveStatPair;
    fouls?: LiveStatPair;
    saves?: LiveStatPair;
    offsides?: LiveStatPair;
    errors?: LiveStatPair;
  };
  officials?: Record<string, string>;
  /**
   * The same four names at several lengths, longest first, by role.
   *
   * `officials` is the raw `full_name` and stays that way — it is compared
   * against the server's payload. This is what the board actually draws, and
   * it exists because that raw name is the one place in the pack a patronymic
   * still reaches air, in the narrowest column there is.
   */
  officialForms?: Record<string, string[]>;
}

/**
 * The `stats` resource. Mirrors `transformStatsForVmix`.
 *
 * One entry per statistic rather than one per side, which is the pivot the
 * server applies and the app's direct read now applies too. Thirteen of them:
 * the board's ten, and the three pass counts.
 *
 * The two card counts are the reason this is typed at all. They are kept in the
 * stats tab by hand and served from `match_stats`, and the live payload does not
 * carry them.
 *
 * The pass counts are the reason it is typed this widely. They arrive only here
 * — `VmixStatsData` gained them when the web app started summing
 * `possession_counts`, and the live payload did not — so anything drawing passes
 * reads this resource, at its 20s cadence rather than live's 1s. That is the
 * right cadence for a number a person types in at half time.
 */
export interface StatsData {
  teams?: {
    home?: { name?: string; short?: string };
    away?: { name?: string; short?: string };
  };
  stats?: {
    possession?: LiveStatPair;
    /**
     * Passes, and only passes.
     *
     * Raw counts per team per half, summed from `match_stats.possession_counts`.
     * There is no attempt/success split in that column, so nothing derived from
     * these may be labelled completed, accurate or successful — the label is
     * HANTARAN and nothing else.
     *
     * **Zero means not recorded.** A match nobody entered counts for sends 0
     * across all three, and so does a half that has not been keyed in yet — the
     * second half reads 0 until full time. Draw neither: `src/passes.ts` drops
     * an unrecorded half and the rack refuses to arm on an unrecorded match.
     */
    passes?: LiveStatPair;
    passesFirstHalf?: LiveStatPair;
    passesSecondHalf?: LiveStatPair;
    shots?: LiveStatPair;
    shotsOnTarget?: LiveStatPair;
    corners?: LiveStatPair;
    fouls?: LiveStatPair;
    yellowCards?: LiveStatPair;
    redCards?: LiveStatPair;
    offsides?: LiveStatPair;
    saves?: LiveStatPair;
    errors?: LiveStatPair;
  };
}

/** The `lineup` resource. Mirrors `transformLineupForVmix`. */
export interface LineupPlayer {
  number?: number;
  name?: string;
  /** The same name at several lengths, longest first. See `LiveEvent`. */
  nameForms?: string[];
  position?: string;
  /**
   * Set only on the captain, absent on everybody else.
   *
   * Present on both transports, unlike `coach` — the direct read has it from
   * `lineups.*`, and the nested vMix format was widened to emit it so the
   * fallback path draws the same team sheet rather than a quieter one.
   */
  isCaptain?: boolean;
}

export interface LineupSide {
  team?: string;
  teamShort?: string;
  /** Derived server-side from the count of each position. Empty when it cannot be. */
  formation?: string;
  /**
   * The club's active head coach, off `team_officials`. Null when none is on
   * file — and null on the API path regardless, which does not carry this.
   */
  coach?: string | null;
  starting?: LineupPlayer[];
  substitutes?: LineupPlayer[];
}

export interface LineupData {
  matchId?: string;
  home?: LineupSide;
  away?: LineupSide;
}

/**
 * Everything a template can read: the bound match and whatever the mirror holds.
 *
 * Assembled once in the render window and passed to every template, so no
 * template ever reaches for data itself. That window has `connect-src 'none'`,
 * and keeping the reach in one place is what keeps that enforceable rather than
 * merely true today.
 */
export interface RenderContext {
  match: Match | null;
  live: LiveData | null;
  lineup: LineupData | null;
  /**
   * The `stats` resource.
   *
   * The board takes eight of its ten numbers off `live.stats`, which carries
   * them on the faster cadence. The two card counts come from here, because the
   * live payload has never carried them and the event list is not the league's
   * record of them.
   */
  stats: StatsData | null;
  /**
   * The league reading of this fixture, or null where there is none.
   *
   * Null is the ordinary case, not the failure: a cup tie, a friendly, or a competition FAM
   * is not mapped to. Every league template checks it and draws nothing, because a mini-table
   * with an empty row is worse on air than no mini-table at all.
   *
   * It arrives from `/api/v1/matches/:matchId/league` rather than being derived here. The
   * snapshot it comes from is behind RLS that wants a real Supabase session, which neither
   * this app's mirror nor the render surface has — so the deriver runs server-side and both
   * tiers read the same answer. See `netlify/functions/league-view.ts` in the web repo.
   */
  league: LeagueData | null;
}

/* --- the league reading ---------------------------------------------------
 *
 * A structural subset of what the web repo's `leagueView()` returns: the fields the
 * graphics actually draw, and no more. The full view satisfies this by shape, so the
 * endpoint sends one object and neither side has to agree a second serialisation.
 *
 * Deliberately not a re-derivation. Everything here is arithmetic somebody has already
 * done — and done once, so the number a commentator reads off `/commentator` and the
 * number a viewer sees on the bar behind them cannot disagree.
 */

/** One row of a league table. `position` is FAM's, re-sorted when we have moved someone. */
export interface LeagueRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/** One result in a club's recent form, newest first. */
export interface LeagueForm {
  outcome: 'W' | 'D' | 'L';
  opponent: string;
  scoreFor: number;
  scoreAgainst: number;
  home: boolean;
  date: string;
}

/** One previous meeting, this season's or an earlier one's. */
export interface LeagueMeeting {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  /** Present on meetings from earlier seasons, absent on this season's. */
  competition?: string;
}

/**
 * One talking point.
 *
 * `kind` is load-bearing rather than a label. Exactly one generator quotes a league
 * position — the `table` fact — and everything else is arithmetic on results we hold. So
 * `kind === 'table'` is precisely the set that may not go on air without the disclaimer,
 * and a template deciding by any other test would eventually be wrong.
 */
export interface LeagueFact {
  kind: string;
  priority: number;
  headline: string;
  detail?: string;
}

export interface LeagueData {
  /** When FAM's snapshot was taken. The provenance line shows it; the rules turn on it. */
  fetchedAt: string;
  /** FAM's table plus our own completed results it cannot contain yet. */
  before: LeagueRow[];
  /** `before` with this match applied, when it counts. Identical to `before` when it does not. */
  after: LeagueRow[];
  /** Whether `after` differs from `before`. */
  applying: boolean;
  /** The match is under way, so there is a scoreline to read at all. */
  started: boolean;
  homeBefore: LeagueRow;
  awayBefore: LeagueRow;
  homeAfter: LeagueRow;
  awayAfter: LeagueRow;
  homeForm: LeagueForm[];
  awayForm: LeagueForm[];
  /** This season's meetings, from FAM's own results. */
  h2h: LeagueMeeting[];
  /** Earlier seasons: ours first, then FAM's archive. */
  past: LeagueMeeting[];
  pastRecord: { w: number; d: number; l: number };
  facts: LeagueFact[];
}

/* --- the playout bus ------------------------------------------------------ */

/**
 * Back to front. One graphic per layer, so nothing can overlap itself.
 *
 * `dock` and `topper` sit behind the bug because what they hold hangs off it —
 * the possession panel slides out from under its bottom edge, added time rises
 * from behind its clock. Neither is part of the bug, for one reason: the
 * operator drops and retracts them many times over a match, and the scorebug
 * must not replay its own entrance each time.
 *
 * They are two layers and not one because a layer means mutual exclusion, and
 * these two never overlap — one is below the bug and the other above it. Sharing
 * would mean putting added time up took the possession bar off.
 */
export type GraphicLayer = 'dock' | 'topper' | 'bug' | 'lower' | 'full';

/**
 * `live` re-renders as the mirror changes; `frozen` keeps the payload it was
 * taken with. A scorebug must follow the score; a goal lower third must not
 * rewrite itself mid-animation because a later event landed.
 */
export type GraphicFeed = 'live' | 'frozen';

export interface GraphicDef {
  id: string;
  /** Operator-facing. What the button says. */
  label: string;
  layer: GraphicLayer;
  feed: GraphicFeed;
  /** Milliseconds until it clears itself, timed from the take. Null means manual. */
  autoOut: number | null;
  /** Layers this ducks while on air. They return on their own when it clears. */
  hides: GraphicLayer[];
  /**
   * The graphic this one hangs off, if any.
   *
   * Three rules follow from it and none of them are written anywhere else: it
   * cannot be taken unless that graphic is on air, it goes off when that
   * graphic does, and it ducks whenever that graphic ducks. Deriving all three
   * from one field means a full screen only ever has to say it hides the bug.
   */
  attachedTo?: string;
  /**
   * When in the match this is useful, for the graphics that stop being useful.
   *
   * Only `prematch` so far: the intro, the team sheets and the officials board,
   * which nobody reaches for once the ball has been kicked. The rack collects
   * them into one collapsible block at the top and folds it away when the clock
   * starts.
   */
  group?: 'prematch';
  /**
   * Where the operator fires it from, when that is not a rack row.
   *
   * `clock` puts the trigger under the match clock. Only added time uses it, and
   * only because its payload is a number the operator reads off the fourth
   * official's board — the rack arms from the feed, and the feed has never
   * carried that number. A row in the rack would be a second trigger for the
   * same graphic that could not carry what the graphic is for.
   */
  firedFrom?: 'clock';
}

export interface GraphicEntry {
  id: string;
  /** Increments on every take. A re-take of the same graphic is a new seq. */
  seq: number;
  data: unknown;
  takenAt: number;
  autoOutAt: number | null;
}

/** `in` and `out` are animating; `on` is settled and fully visible. */
export type GraphicPhase = 'in' | 'on' | 'out';

/**
 * What the operator asked for (`layers`) alongside what the render window says
 * is happening (`actual`). Deliberately two things: "taken" and "on screen" are
 * different claims, and the gap between them is where a broken template shows.
 */
export interface GraphicsState {
  seq: number;
  /** Set by a panic. The render window reads it as "unmount, do not animate". */
  panicSeq: number | null;
  layers: Record<GraphicLayer, GraphicEntry | null>;
  suppressed: GraphicLayer[];
  actual: Record<string, GraphicPhase>;
  /**
   * Manifest entries the render window has no component for. Empty is the only
   * good answer — the manifest lives in the main process and the components
   * live in the renderer, and nothing in the type system connects them.
   */
  missing: string[];
}

export type FailureReason = 'invalid' | 'revoked' | 'expired' | 'seat_limit' | 'network' | 'server';

export interface Failure {
  ok: false;
  error: string;
  reason: FailureReason;
  activated?: boolean;
}

export type Result<T> = ({ ok: true } & T) | Failure;

// --- what each template expects on air ------------------------------------
//
// Copied verbatim from the templates in the graphics repo, which own them. They
// are restated here because they are the contract arming writes against, and the
// first draft of this block was written from memory and got SubstitutionPayload
// wrong — `on`/`off` instead of `playerOn`/`playerOff`. The compiler caught it;
// on air it would have been two blank names under the arrows.

/** `GoalLower` — copied verbatim from the template. */
export interface GoalPayload {
  player?: string;
  /** Longer forms of the same name, longest first. See `Slot`'s `forms`. */
  playerForms?: string[];
  playerNumber?: number;
  minute?: number;
  teamName?: string;
  teamShort?: string;
  /** `own_goal` gets its own label; anything else reads as a goal. */
  type?: string;
}

/** `CardLower` — copied verbatim from the template. */
export interface CardPayload {
  player?: string;
  /** Longer forms of the same name, longest first. See `Slot`'s `forms`. */
  playerForms?: string[];
  playerNumber?: number;
  minute?: number;
  teamName?: string;
  teamShort?: string;
  /** `yellow` or `red`, as the events table spells them. */
  card?: string;
}

/** `SubstitutionLower` — copied verbatim from the template. */
export interface SubstitutionPayload {
  /** Coming on. The events table calls this `player` on a `sub_in`. */
  playerOn?: string;
  /** Longer forms of the same name, longest first. See `Slot`'s `forms`. */
  playerOnForms?: string[];
  playerOnNumber?: number;
  /** Going off — `related_player` on the same event. */
  playerOff?: string;
  playerOffForms?: string[];
  playerOffNumber?: number;
  minute?: number;
  teamName?: string;
  teamShort?: string;
}

/** `AddedTime` — copied verbatim from the template. */
export interface AddedTimePayload {
  /** Whole minutes. Clamped by the control that sets it, guarded again here. */
  minutes?: number;
}
