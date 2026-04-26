import { withApiContext } from "@/lib/api-helpers";
import { Deal } from "@/models/Deal";

/**
 * GET /api/deals
 * Returns the current user's cached Lightfield deals plus the most recent
 * sync timestamp (so the nav can show "Sales · 2h ago").
 */
export async function GET() {
  return withApiContext(async ({ userId }) => {
    const deals = await Deal.find({ userId })
      .sort({ lightfieldUpdatedAt: -1, cachedAt: -1 })
      .lean();

    const lastCachedAt = deals.reduce<Date | null>((acc, d) => {
      if (!d.cachedAt) return acc;
      return !acc || d.cachedAt > acc ? d.cachedAt : acc;
    }, null);

    return {
      deals,
      lastCachedAt: lastCachedAt ? lastCachedAt.toISOString() : null,
      count: deals.length,
    };
  });
}

export const runtime = "nodejs";
