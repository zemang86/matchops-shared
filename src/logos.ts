// Team badge paths. Extracted from the web app's imageProcessing.ts so the graphics
// app builds identical URLs — if these two drift, badges break on air.
//
// Badges are NOT a database column: they live in a public `team-logos` bucket at a
// path derived by convention. Keep this file and the uploader in lockstep.

export const LOGO_SIZES = [32, 64, 128, 256, 512, 1024] as const;
export type LogoSize = (typeof LOGO_SIZES)[number];

/** The size written as PNG for broadcast use. Everything smaller is WebP. */
export const BROADCAST_LOGO_SIZE: LogoSize = 1024;

export type LogoExtension = 'webp' | 'png';

export const getLogoStoragePath = (
  teamId: string,
  size: LogoSize,
  extension: LogoExtension = 'webp',
): string => `${teamId}/logo-${size}.${extension}`;

const publicUrl = (supabaseUrl: string, path: string): string =>
  `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/team-logos/${path}`;

/**
 * Web URL for a badge. `extension` is an explicit argument rather than being sniffed
 * from the DOM: this module has to run in Electron's main process and in Node, where
 * `document` does not exist.
 */
export const getLogoPublicUrl = (
  supabaseUrl: string,
  teamId: string,
  size: LogoSize = 512,
  extension: LogoExtension = 'webp',
): string => publicUrl(supabaseUrl, getLogoStoragePath(teamId, size, extension));

/** Always PNG at 1024. vMix cannot read WebP, and neither should broadcast graphics. */
export const getBroadcastLogoUrl = (
  supabaseUrl: string,
  teamId: string,
  size: LogoSize = BROADCAST_LOGO_SIZE,
): string => publicUrl(supabaseUrl, getLogoStoragePath(teamId, size, 'png'));

/** Kept under the old name so the web app's existing call sites do not have to change. */
export const getVmixLogoUrl = getBroadcastLogoUrl;

/**
 * Cache key for the graphics app's on-disk badge store.
 *
 * There is no version column in the schema and none is planned: two badges at 1024px
 * is about 200KB, so the graphics app simply re-fetches both when a match is selected.
 * Pass any version string you do have; pass null to key on team and size alone.
 */
export const getLogoCacheKey = (
  teamId: string,
  size: LogoSize,
  logoUpdatedAt: string | null | undefined,
): string => `${teamId}-${size}-${logoUpdatedAt ?? 'none'}`;
