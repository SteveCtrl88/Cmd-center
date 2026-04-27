import { NextResponse } from "next/server";
import {
  buildOptionLabelMap,
  getTaskDefinitions,
  listTasks,
  type LightfieldTask,
} from "@/lib/lightfield";

const KNOWN_LINKED_TASK = "tsk_cmnnr375l001pl8pk8i87hzk7";

/**
 * GET /api/lightfield/debug/tasks
 *
 * Probe the /v1/tasks endpoint so we can see exactly what fields and
 * relationships come back. Used to design the task projection + sync.
 * Remove once Phase 2.5 (tasks) is verified.
 */
export async function GET() {
  try {
    let tasks: LightfieldTask[] = [];
    let listError: string | null = null;
    try {
      tasks = await listTasks({ maxRecords: 1000 });
    } catch (err) {
      listError = err instanceof Error ? err.message : "List failed";
    }

    const ids = tasks.map((t) => t.id);
    const linkedHit = tasks.find((t) => t.id === KNOWN_LINKED_TASK);
    // Also try direct fetch via path
    let directFetch: unknown = null;
    try {
      const r = await fetch(
        `https://api.lightfield.app/v1/tasks/${KNOWN_LINKED_TASK}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.LIGHTFIELD_API_KEY}`,
            "Lightfield-Version": "2026-03-01",
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );
      directFetch = { status: r.status, body: await r.json().catch(() => null) };
    } catch (e) {
      directFetch = { error: e instanceof Error ? e.message : "fetch failed" };
    }

    const definitions = await getTaskDefinitions().catch((err) => ({
      error: err instanceof Error ? err.message : "defs failed",
    }));
    const labels = buildOptionLabelMap(definitions);

    return NextResponse.json({
      ok: true,
      sampleCount: tasks.length,
      listError,
      definitionsRaw: definitions,
      optionLabelsCount: Object.keys(labels).length,
      optionLabels: labels,
      knownLinkedTask: KNOWN_LINKED_TASK,
      foundInList: Boolean(linkedHit),
      directFetch,
      taskIds: ids,
      first: tasks[0] ?? null,
      allFieldKeys: Array.from(
        new Set(tasks.flatMap((t) => Object.keys(t.fields ?? {})))
      ).sort(),
      relationshipKeys: Array.from(
        new Set(tasks.flatMap((t) => Object.keys(t.relationships ?? {})))
      ).sort(),
    });
  } catch (err) {
    console.error("[lightfield/debug/tasks]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Debug tasks failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
