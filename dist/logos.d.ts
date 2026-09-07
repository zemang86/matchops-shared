export declare const LOGO_SIZES: readonly [32, 64, 128, 256, 512, 1024];
export type LogoSize = (typeof LOGO_SIZES)[number];
/** The size written as PNG for broadcast use. Everything smaller is WebP. */
export declare const BROADCAST_LOGO_SIZE: LogoSize;
export type LogoExtension = 'webp' | 'png';
export declare const getLogoStoragePath: (teamId: string, size: LogoSize, extension?: LogoExtension) => string;
/**
 * Web URL for a badge. `extension` is an explicit argument rather than being sniffed
 * from the DOM: this module has to run in Electron's main process and in Node, where
 * `document` does not exist.
 */
export declare const getLogoPublicUrl: (supabaseUrl: string, teamId: string, size?: LogoSize, extension?: LogoExtension) => string;
/** Always PNG at 1024. vMix cannot read WebP, and neither should broadcast graphics. */
export declare const getBroadcastLogoUrl: (supabaseUrl: string, teamId: string, size?: LogoSize) => string;
/** Kept under the old name so the web app's existing call sites do not have to change. */
export declare const getVmixLogoUrl: (supabaseUrl: string, teamId: string, size?: LogoSize) => string;
/**
 * Cache key for the graphics app's on-disk badge store.
 *
 * There is no version column in the schema and none is planned: two badges at 1024px
 * is about 200KB, so the graphics app simply re-fetches both when a match is selected.
 * Pass any version string you do have; pass null to key on team and size alone.
 */
export declare const getLogoCacheKey: (teamId: string, size: LogoSize, logoUpdatedAt: string | null | undefined) => string;
