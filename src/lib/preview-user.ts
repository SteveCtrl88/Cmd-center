import { isPreviewMode } from "@/lib/preview";

/**
 * Stable user identifier for preview/demo mode.
 * Once real auth is wired in, swap callers over to getServerSession + the
 * real user id. For now, every preview request maps to this single user
 * so the data is consistent across sessions.
 */
export const PREVIEW_USER_ID = "preview-user";
export const PREVIEW_USER_EMAIL = "steve@ctrlrobotics.com";

/**
 * Returns the current user id. In preview mode this is a fixed string.
 * In real mode (Phase 5) this will read from the NextAuth session.
 */
export async function getCurrentUserId(): Promise<string> {
  if (isPreviewMode()) return PREVIEW_USER_ID;

  // Real path — keep this so the function signature stays stable when
  // we switch off preview mode.
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
