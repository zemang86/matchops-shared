// Team badge paths. Extracted from the web app's imageProcessing.ts so the graphics
// app builds identical URLs — if these two drift, badges break on air.
//
// Badges are NOT a database column: they live in a public `team-logos` bucket at a
// path derived by convention. Keep this file and the uploader in lockstep.
export const LOGO_SIZES = [32, 64, 128, 256, 512, 1024];
/** The size written as PNG for broadcast use. Everything smaller is WebP. */
export const BROADCAST_LOGO_SIZE = 1024;
export const getLogoStoragePath = (teamId, size, extension = 'webp') => `${teamId}/logo-${size}.${extension}`;
const publicUrl = (supabaseUrl, path) => `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/team-logos/${path}`;
/**
 * Web URL for a badge. `extension` is an explicit argument rather than being sniffed
 * from the DOM: this module has to run in Electron's main process and in Node, where
 * `document` does not exist.
 */
export const getLogoPublicUrl = (supabaseUrl, teamId, size = 512, extension = 'webp') => publicUrl(supabaseUrl, getLogoStoragePath(teamId, size, extension));
/** Always PNG at 1024. vMix cannot read WebP, and neither should broadcast graphics. */
export const getBroadcastLogoUrl = (supabaseUrl, teamId, size = BROADCAST_LOGO_SIZE) => publicUrl(supabaseUrl, getLogoStoragePath(teamId, size, 'png'));
/** Kept under the old name so the web app's existing call sites do not have to change. */
export const getVmixLogoUrl = getBroadcastLogoUrl;
/**
 * Cache key for the graphics app's on-disk badge store.
 *
 * There is no version column in the schema and none is planned: two badges at 1024px
 * is about 200KB, so the graphics app simply re-fetches both when a match is selected.
 * Pass any version string you do have; pass null to key on team and size alone.
 */
export const getLogoCacheKey = (teamId, size, logoUpdatedAt) => `${teamId}-${size}-${logoUpdatedAt ?? 'none'}`;
