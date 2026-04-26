/**
 * Preview / demo mode flag.
 *
 * When PREVIEW_MODE=1 (or "true") is set in env, the app skips Google sign-in
 * and middleware auth checks, and the dashboard renders against demo data.
 * This is for sharing a deploy preview before real OAuth + MongoDB are wired.
 *
 * REMOVE THIS BEFORE PHASE 2 — production builds should never run with this on.
 */
export function isPreviewMode(): boolean {
  const v = process.env.PREVIEW_MODE?.toLowerCase().trim();
  return v === "1" || v === "true";
}
