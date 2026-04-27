import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { getCurrentUserId } from "@/lib/preview-user";
import { syncLightfieldDeals } from "@/lib/lightfield-sync";

/**
 * GET /api/lightfield/debug/sync
 *
 * Runs the sync inline (no rate limit) and reads the resulting Deal
 * doc(s) back from Mongo so we can verify the projection actually
 * landed (e.g. stage resolved to its label, not the raw opt_<uuid>).
 *
 * Remove after Phase 2 verification.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const result = await syncLightfieldDeals(userId);
    await connectToDatabase();
    const docs = await Deal.find({ userId }).lean();
    return NextResponse.json({
      ok: true,
      result,
      currentUserId: userId,
      dealCount: docs.length,
      deals: docs.map((d) => ({
        _id: String(d._id),
        userId: d.userId,
        lightfieldId: d.lightfieldId,
        name: d.name,
        accountName: d.accountName,
        stage: d.stage,
        amount: d.amount,
        nextSteps: d.nextSteps,
        owner: d.owner,
        cachedAt: d.cachedAt,
        lightfieldUpdatedAt: d.lightfieldUpdatedAt,
      })),
    });
  } catch (err) {
    console.error("[lightfield/debug/sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
