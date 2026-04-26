import { NextResponse } from "next/server";
import { syncLightfieldDeals } from "@/lib/lightfield-sync";
import { getCurrentUserId } from "@/lib/preview-user";

/**
 * POST /api/lightfield/refresh
 * Manual sync trigger from the Sales dashboard's Refresh button. Rate-limited
 * to one call per 15 minutes per user via an in-memory map.
 *
 * The in-memory rate limiter is fine for solo / single-region use. If we
 * ever scale horizontally we'll move it to Redis/Upstash.
 */
const lastRefreshByUser = new Map<string, number>();
const COOLDOWN_MS = 15 * 60 * 1000;

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    const last = lastRefreshByUser.get(userId) ?? 0;
    const since = Date.now() - last;
    if (since < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - since) / 1000);
      return NextResponse.json(
        {
          error: `Too many refreshes — try again in ${Math.ceil(retryAfter / 60)} min`,
        },
        { status: 429, headers: { "retry-after": String(retryAfter) } }
      );
    }

    const result = await syncLightfieldDeals(userId);
    lastRefreshByUser.set(userId, Date.now());

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[lightfield/refresh]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
