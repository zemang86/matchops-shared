/**
 * The five statuses an operator can actually reach.
 *
 * They are exactly the web app's own buttons, which are the only thing that
 * moves a match between them:
 *
 *     pre --[Start 1st Half]--> 1h --[Half Time]--> ht
 *         --[Start 2nd Half]--> 2h --[Full Time]--> ft
 */
export declare const HEADLINE: Record<string, string>;
/**
 * The word for a status, and the only place that decides it.
 *
 * `abandoned` is in the database enum but no button sets it, so it is reachable
 * only by editing the row by hand. It falls through with anything unrecognised
 * to SKOR, which is the one word that is true whatever happened — a headline
 * asserting a stage the app is not sure of is how MASA PENUH ends up over a
 * match still being played.
 */
export declare const headlineFor: (status: string | null | undefined) => string;
