import { connectToDatabase } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import {
  listOpportunities,
  projectOpportunity,
  type LightfieldOpportunity,
} from "@/lib/lightfield";

export interface SyncResult {
  fetched: number;
  upserted: number;
  removedStale: number;
  durationMs: number;
}

/**
 * Pull every Opportunity from Lightfield and upsert into the local Deal cache.
 *
 *  - One Mongo upsert per opportunity, keyed on (userId, lightfieldId).
 *  - `cachedAt` is bumped to now so the TTL index doesn't prune records
 *    that are still active in Lightfield.
 *  - Records that no longer appear in the Lightfield response are NOT
 *    explicitly deleted — the TTL takes care of them after 48h. This is
 *    a deliberately conservative behavior (lazy cleanup, easy to debug).
 */
export async function syncLightfieldDeals(userId: string): Promise<SyncResult> {
  const startedAt = Date.now();
  await connectToDatabase();

  const opportunities = await listOpportunities({ maxRecords: 500 });
  const now = new Date();

  let upserted = 0;
  for (const o of opportunities) {
    await upsertOpportunity(userId, o, now);
    upserted++;
  }

  return {
    fetched: opportunities.length,
    upserted,
    removedStale: 0,
    durationMs: Date.now() - startedAt,
  };
}

async function upsertOpportunity(
  userId: string,
  o: LightfieldOpportunity,
  cachedAt: Date
) {
  const projected = projectOpportunity(o);

  await Deal.updateOne(
    { userId, lightfieldId: o.id },
    {
      $set: {
        userId,
        lightfieldId: o.id,
        name: projected.name ?? "",
        accountName: projected.accountName ?? "",
        stage: projected.stage ?? "",
        amount: projected.amount ?? null,
        nextSteps: projected.nextSteps ?? "",
        owner: projected.owner ?? "",
        description: projected.description ?? "",
        httpLink: projected.httpLink ?? "",
        rawFields: o.fields ?? {},
        lightfieldCreatedAt: o.createdAt ? new Date(o.createdAt) : undefined,
        lightfieldUpdatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
        cachedAt,
      },
    },
    { upsert: true }
  );
}
