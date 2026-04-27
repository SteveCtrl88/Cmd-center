import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import { getCurrentUserId } from "@/lib/preview-user";

/**
 * GET /api/lightfield/debug/db
 * Dumps Deal collection state so we can debug why the sync inserts data
 * but reads return empty. Remove once Phase 2 is verified.
 */
export async function GET() {
  await connectToDatabase();
  const currentUserId = await getCurrentUserId().catch(
    () => "no-user-resolved"
  );

  const all = await Deal.find({}).limit(20).lean();
  const userIds = Array.from(new Set(all.map((d) => d.userId)));

  return NextResponse.json({
    currentUserId,
    totalCount: all.length,
    userIds,
    samples: all.slice(0, 3).map((d) => ({
      _id: String(d._id),
      userId: d.userId,
      lightfieldId: d.lightfieldId,
      name: d.name,
      stage: d.stage,
      cachedAt: d.cachedAt,
      lightfieldUpdatedAt: d.lightfieldUpdatedAt,
    })),
  });
}

export const runtime = "nodejs";
