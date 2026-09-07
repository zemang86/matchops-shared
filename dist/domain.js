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
export {};
