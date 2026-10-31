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
export const FLASH_STATS = ['possession', 'shots', 'shotsOnTarget', 'corners', 'offsides'];
/** On the rack button, so short. The on-air word is the render surface's, in Malay. */
export const FLASH_LABEL = {
    possession: 'Possession',
    shots: 'Shots',
    shotsOnTarget: 'On target',
    corners: 'Corners',
    offsides: 'Offsides',
};
/**
 * Which stat a payload asks for.
 *
 * Anything it does not recognise is possession, because possession is all the panel drew
 * before it took a payload: a `graphics_state` row persisted by an older panel carries
 * `data: null`, and a reloaded overlay must draw what was on air, not nothing.
 */
export function flashStat(data) {
    const stat = data?.stat;
    return FLASH_STATS.includes(stat) ? stat : 'possession';
}
/** Home and away, from the live feed. Missing is zero, and zero means not recorded. */
export function flashPair(live, stat) {
    const s = live?.stats;
    switch (stat) {
        case 'shots':
            return [s?.shots?.home?.total ?? 0, s?.shots?.away?.total ?? 0];
        case 'shotsOnTarget':
            return [s?.shots?.home?.on ?? 0, s?.shots?.away?.on ?? 0];
        default:
            return [s?.[stat]?.home ?? 0, s?.[stat]?.away ?? 0];
    }
}
/** `55% – 45%` for possession, `4 – 2` for a count. */
export function flashFigures(stat, [home, away]) {
    const unit = stat === 'possession' ? '%' : '';
    return `${home}${unit} – ${away}${unit}`;
}
