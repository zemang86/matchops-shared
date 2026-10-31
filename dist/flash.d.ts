import type { LiveData } from './domain.js';
/**
 * The stats the panel under the scorebug can flash, in the order the rack shows them.
 *
 * Five, chosen 2026-10-30. Saves, fouls, errors and cards stay on the full board: the
 * panel is one figure at a glance, and those read better in context. Adding one back is
 * an entry here, its label, and its on-air word in the render surface.
 *
 * Every one is read from `live.stats`, the same source as the full board, so the flash
 * and the board can never show different numbers for the same thing.
 */
export declare const FLASH_STATS: readonly ["possession", "shots", "shotsOnTarget", "corners", "offsides"];
export type FlashStat = (typeof FLASH_STATS)[number];
/** What `miniStats` is taken with. */
export interface FlashPayload {
    stat: FlashStat;
}
/** On the rack button, so short. The on-air word is the render surface's, in Malay. */
export declare const FLASH_LABEL: Record<FlashStat, string>;
/**
 * Which stat a payload asks for.
 *
 * Anything it does not recognise is possession, because possession is all the panel drew
 * before it took a payload: a `graphics_state` row persisted by an older panel carries
 * `data: null`, and a reloaded overlay must draw what was on air, not nothing.
 */
export declare function flashStat(data: unknown): FlashStat;
/** Home and away, from the live feed. Missing is zero, and zero means not recorded. */
export declare function flashPair(live: LiveData | null | undefined, stat: FlashStat): [number, number];
/** `55% – 45%` for possession, `4 – 2` for a count. */
export declare function flashFigures(stat: FlashStat, [home, away]: [number, number]): string;
