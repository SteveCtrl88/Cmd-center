import { NextRequest, NextResponse } from "next/server";
import { syncLightfieldDeals } from "@/lib/lightfield-sync";
import { PREVIEW_USER_ID } from "@/lib/preview-user";

/**
 * GET /api/cron/sync-lightfield
 * Triggered by Vercel Cron every 6h (see vercel.json). Gated by CRON_SECRET
 * so a curl from anywhere can't trigger expensive syncs.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when
 * invoking cron jobs in production.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Single-user mode: sync runs for the configured account. When real auth
    // lands in a later phase we'll iterate over all subscribed users.
    const result = await syncLightfieldDeals(PREVIEW_USER_ID);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron sync-lightfield]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
