import { connectToDatabase } from "@/lib/mongodb";
import { Deal } from "@/models/Deal";
import {
  buildOptionLabelMap,
  getOpportunityDefinitions,
  indexOpportunityTaskIds,
  listOpportunities,
  listTasks,
  projectOpportunity,
  projectTask,
  type LightfieldOpportunity,
  type ProjectedTask,
} from "@/lib/lightfield";

export interface SyncResult {
  fetched: number;
  fetchedTasks: number;
  upserted: number;
  removedStale: number;
  durationMs: number;
}

/**
 * Pull every Opportunity (and every Task) from Lightfield and upsert into the
 * local Deal cache.
 *
 *  - One Mongo upsert per opportunity, keyed on (userId, lightfieldId).
 *  - Tasks are fetched once globally, indexed by id, then attached to each
 *    deal via the opp-side `relationships.$task` link (the reverse link on
 *    a task is sometimes empty even when the forward one is set).
 *  - `cachedAt` is bumped to now so the TTL index doesn't prune records
 *    that are still active in Lightfield.
 *  - Records that no longer appear in the Lightfield response are NOT
 *    explicitly deleted — the TTL takes care of them after 48h.
 */
export async function syncLightfieldDeals(userId: string): Promise<SyncResult> {
  const startedAt = Date.now();
  await connectToDatabase();

  // Pull the per-account schema first so we can resolve `$stage` option
  // IDs (`opt_xxx`) to human-readable labels. If definitions fail we
  // continue with raw IDs rather than abort the entire sync.
  const definitions = await getOpportunityDefinitions().catch(() => null);
  const labels = buildOptionLabelMap(definitions);

  const opportunities = await listOpportunities({ maxRecords: 500 });

  // Tasks: fetch all, project, build a map by id so we can attach each
  // task to whichever deals link to it. If the tasks list errors we
  // continue with empty task lists rather than abort.
  let allTasks: ProjectedTask[] = [];
  try {
    const rawTasks = await listTasks({ maxRecords: 1000 });
    allTasks = rawTasks.map(projectTask);
  } catch (err) {
    console.error("[syncLightfieldDeals] task fetch failed:", err);
  }
  const tasksById: Record<string, ProjectedTask> = {};
  for (const t of allTasks) tasksById[t.id] = t;

  const taskIdsByOpp = indexOpportunityTaskIds(opportunities);
  const now = new Date();

  let upserted = 0;
  for (const o of opportunities) {
    const taskIds = taskIdsByOpp[o.id] ?? [];
    const tasks = taskIds
      .map((id) => tasksById[id])
      .filter((t): t is ProjectedTask => Boolean(t));
    await upsertOpportunity(userId, o, now, labels, tasks);
    upserted++;
  }

  return {
    fetched: opportunities.length,
    fetchedTasks: allTasks.length,
    upserted,
    removedStale: 0,
    durationMs: Date.now() - startedAt,
  };
}

async function upsertOpportunity(
  userId: string,
  o: LightfieldOpportunity,
  cachedAt: Date,
  optionLabels: Record<string, string>,
  tasks: ProjectedTask[]
) {
  const projected = projectOpportunity(o, optionLabels);

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
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          dueAt: t.dueAt ? new Date(t.dueAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          httpLink: t.httpLink,
        })),
        lightfieldCreatedAt: o.createdAt ? new Date(o.createdAt) : undefined,
        lightfieldUpdatedAt: o.updatedAt ? new Date(o.updatedAt) : undefined,
        cachedAt,
      },
    },
    { upsert: true }
  );
}
