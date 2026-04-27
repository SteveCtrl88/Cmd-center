import { NextResponse } from "next/server";
import {
  buildOptionLabelMap,
  getTaskDefinitions,
  listTasks,
  type LightfieldTask,
} from "@/lib/lightfield";

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
      tasks = await listTasks({ limit: 5, maxRecords: 5 });
    } catch (err) {
      listError = err instanceof Error ? err.message : "List failed";
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
