import { NextResponse } from "next/server";
import {
  buildOptionLabelMap,
  getOpportunityDefinitions,
  listOpportunities,
  projectOpportunity,
  validateAuth,
  type LightfieldOpportunity,
} from "@/lib/lightfield";

/**
 * GET /api/lightfield/debug
 *
 * One-shot diagnostic endpoint that hits Lightfield with the configured
 * key, validates auth, fetches the first 3 opportunities, and returns
 * both the raw + projected views so we can verify the field-name mapping
 * matches your account's schema.
 *
 * Remove or gate this after Phase 2 is verified.
 */
export async function GET() {
  try {
    const auth = await validateAuth().catch((err) => ({
      error: err instanceof Error ? err.message : "Auth failed",
    }));

    let opportunities: LightfieldOpportunity[] = [];
    let listError: string | null = null;
    try {
      opportunities = await listOpportunities({ limit: 3, maxRecords: 3 });
    } catch (err) {
      listError = err instanceof Error ? err.message : "List failed";
    }

    const definitions = await getOpportunityDefinitions().catch((err) => ({
      error: err instanceof Error ? err.message : "defs failed",
    }));
    const labels = buildOptionLabelMap(definitions);

    return NextResponse.json({
      ok: true,
      auth,
      sampleCount: opportunities.length,
      listError,
      definitionsRaw: definitions,
      optionLabelsCount: Object.keys(labels).length,
      optionLabels: labels,
      first: opportunities[0]
        ? {
            raw: opportunities[0],
            projected: projectOpportunity(opportunities[0], labels),
            fieldKeys: Object.keys(opportunities[0].fields ?? {}),
          }
        : null,
      allFieldKeys: Array.from(
        new Set(opportunities.flatMap((o) => Object.keys(o.fields ?? {})))
      ).sort(),
    });
  } catch (err) {
    console.error("[lightfield/debug]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Debug failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
