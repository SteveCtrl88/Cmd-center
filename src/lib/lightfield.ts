/**
 * Lightfield API client.
 *
 * Docs: https://lightfield.stldocs.app
 * Base URL: https://api.lightfield.app/v1
 * Auth: Authorization: Bearer <key>
 * Required header: Lightfield-Version: 2026-03-01
 *
 * Each entity is dynamic — `fields` is a map of {fieldName: {value, valueType}}.
 * System fields are prefixed with `$` (e.g. `$name`, `$amount`); custom
 * attributes use their bare slug. Stage names depend on the user's account
 * configuration, so we store the raw map and project the well-known fields.
 */

const DEFAULT_BASE_URL = "https://api.lightfield.app/v1";
const API_VERSION = "2026-03-01";

export type FieldValue = string | number | boolean | null | unknown;

export interface LightfieldField {
  value: FieldValue;
  valueType?: string;
}

export interface LightfieldOpportunity {
  id: string;
  createdAt: string;
  updatedAt?: string;
  fields: Record<string, LightfieldField>;
  httpLink?: string;
  // Some endpoints include related accounts/contacts inline
  account?: { id?: string; fields?: Record<string, LightfieldField> };
}

export interface ListResponse<T> {
  data: T[];
  // Lightfield's pagination shape varies between cursor and offset — we
  // pull both so we can iterate either way without breaking when the
  // shape evolves.
  hasMore?: boolean;
  nextCursor?: string;
  cursor?: string;
  total?: number;
}

class LightfieldError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function getConfig() {
  const apiKey = process.env.LIGHTFIELD_API_KEY;
  if (!apiKey) {
    throw new Error("LIGHTFIELD_API_KEY is not set");
  }
  const baseUrl = (process.env.LIGHTFIELD_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );
  return { apiKey, baseUrl };
}

async function lf<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { apiKey, baseUrl } = getConfig();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Lightfield-Version": API_VERSION,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // leave as text
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? // @ts-expect-error narrowed
          String(body.error?.message ?? body.error ?? res.statusText)
        : res.statusText;
    throw new LightfieldError(res.status, body, `Lightfield ${res.status}: ${msg}`);
  }

  return body as T;
}

/** GET /v1/opportunities — paginated list. Auto-iterates through all pages. */
export async function listOpportunities(opts: {
  limit?: number;
  /** Hard cap so a runaway sync can't blow our cache. */
  maxRecords?: number;
} = {}): Promise<LightfieldOpportunity[]> {
  // Lightfield caps `limit` at 25 per page — we paginate to fetch more.
  const limit = Math.min(opts.limit ?? 25, 25);
  const maxRecords = opts.maxRecords ?? 500;

  const all: LightfieldOpportunity[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (all.length < maxRecords) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);

    const page = await lf<ListResponse<LightfieldOpportunity>>(
      `/opportunities?${qs.toString()}`
    );

    const items = page.data ?? [];
    all.push(...items);

    pages++;
    if (pages > 20) break; // safety: at most 20 pages

    if (!page.hasMore) break;
    cursor = page.nextCursor ?? page.cursor;
    if (!cursor) break;
  }

  return all.slice(0, maxRecords);
}

export async function getOpportunity(id: string): Promise<LightfieldOpportunity> {
  return lf<LightfieldOpportunity>(`/opportunities/${encodeURIComponent(id)}`);
}

export async function getOpportunityDefinitions(): Promise<unknown> {
  return lf("/opportunities/definitions");
}

export async function validateAuth(): Promise<unknown> {
  // GET /v1/auth/validate per the Auth endpoint shown in the docs
  return lf("/auth/validate");
}

/**
 * GET /v1/tasks — list all tasks (paginated). Tasks belong to opportunities,
 * accounts, or contacts; each task has its own `fields` map and `relationships`
 * pointing back to the parent record.
 */
export interface LightfieldTask {
  id: string;
  createdAt: string;
  updatedAt?: string;
  fields: Record<string, LightfieldField>;
  relationships?: Record<
    string,
    { cardinality?: string; objectType?: string; values?: string[] }
  >;
  httpLink?: string;
}

export async function listTasks(opts: {
  limit?: number;
  maxRecords?: number;
} = {}): Promise<LightfieldTask[]> {
  const limit = Math.min(opts.limit ?? 25, 25);
  const maxRecords = opts.maxRecords ?? 500;

  const all: LightfieldTask[] = [];
  let cursor: string | undefined;
  let pages = 0;

  while (all.length < maxRecords) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set("cursor", cursor);

    const page = await lf<ListResponse<LightfieldTask>>(
      `/tasks?${qs.toString()}`
    );
    const items = page.data ?? [];
    all.push(...items);

    pages++;
    if (pages > 20) break;
    if (!page.hasMore) break;
    cursor = page.nextCursor ?? page.cursor;
    if (!cursor) break;
  }

  return all.slice(0, maxRecords);
}

export async function getTaskDefinitions(): Promise<unknown> {
  return lf("/tasks/definitions");
}

export { LightfieldError };

/**
 * Helpers for projecting raw Lightfield field maps onto the shape we
 * care about for the Sales dashboard. Field names come from the docs —
 * if the user's account uses different slugs we'll catch them in the
 * /api/lightfield/debug response and adjust this helper.
 */

const FIELD_NAME_KEYS = ["$name", "name", "$title", "title"];
const FIELD_STAGE_KEYS = ["$stage", "stage", "pipeline_stage"];
const FIELD_AMOUNT_KEYS = ["$amount", "amount", "deal_amount", "$dealAmount"];
const FIELD_NEXT_STEPS_KEYS = [
  // Lightfield uses singular `$nextStep` per the live schema; keeping
  // pluralized fallbacks too in case future configs differ.
  "$nextStep",
  "$nextSteps",
  "next_steps",
  "nextSteps",
  "next_step",
];
const FIELD_OWNER_KEYS = ["$owner", "owner", "$assignedTo", "assignedTo"];
const FIELD_DESCRIPTION_KEYS = [
  "$description",
  "description",
  "summary",
  "$closeReason",
];
const FIELD_ACCOUNT_KEYS = ["$account", "account", "$accountName", "accountName"];
const FIELD_OPPORTUNITY_STATUS_KEYS = ["$opportunityStatus", "opportunityStatus"];

function pickField(
  fields: Record<string, LightfieldField> | undefined,
  candidates: string[]
): FieldValue | undefined {
  if (!fields) return undefined;
  for (const k of candidates) {
    if (k in fields && fields[k]?.value != null) return fields[k]!.value;
  }
  return undefined;
}

/**
 * Lightfield definitions endpoint returns the per-account schema. The actual
 * shape (verified live against this account):
 *
 *   {
 *     objectType: "opportunity",
 *     fieldDefinitions: {
 *       "$stage": {
 *         id, label, valueType: "SINGLE_SELECT",
 *         typeConfiguration: { options: [{ id: "opt_xxx", label, description }] }
 *       },
 *       ...
 *     },
 *     relationshipDefinitions: { ... }
 *   }
 *
 * We only care about the option lists nested under SINGLE_SELECT fields.
 */
interface DefinitionsResponse {
  fieldDefinitions?: Record<
    string,
    {
      id?: string;
      label?: string;
      valueType?: string;
      typeConfiguration?: {
        options?: Array<{ id?: string; label?: string; description?: string }>;
      };
    }
  >;
}

/**
 * Build a lookup from option ids to their human labels for every option-typed
 * field. Stage values come back as `opt_<uuid>` from the API and are useless
 * to display directly — this map turns them into "Lead", "Qualification",
 * "Demo", "Trial", "Proposal", "Won", "Lost", etc.
 */
export function buildOptionLabelMap(
  defs: unknown
): Record<string, string> {
  const out: Record<string, string> = {};
  const safe = defs as DefinitionsResponse;
  for (const field of Object.values(safe?.fieldDefinitions ?? {})) {
    for (const opt of field?.typeConfiguration?.options ?? []) {
      if (!opt?.id || !opt?.label) continue;
      out[opt.id] = opt.label;
    }
  }
  return out;
}

export function projectOpportunity(
  o: LightfieldOpportunity,
  optionLabels: Record<string, string> = {}
) {
  const accountField = pickField(o.fields, FIELD_ACCOUNT_KEYS);
  const accountFromInline = o.account?.fields
    ? pickField(o.account.fields, FIELD_NAME_KEYS)
    : undefined;

  const stageRaw = pickField(o.fields, FIELD_STAGE_KEYS);
  const stage =
    typeof stageRaw === "string" && optionLabels[stageRaw]
      ? optionLabels[stageRaw]
      : (stageRaw as string | undefined);

  const statusRaw = pickField(o.fields, FIELD_OPPORTUNITY_STATUS_KEYS);
  const status =
    typeof statusRaw === "string" && optionLabels[statusRaw]
      ? optionLabels[statusRaw]
      : (statusRaw as string | undefined);

  return {
    id: o.id,
    name: pickField(o.fields, FIELD_NAME_KEYS) as string | undefined,
    stage,
    status,
    amount: pickField(o.fields, FIELD_AMOUNT_KEYS) as number | string | undefined,
    nextSteps: pickField(o.fields, FIELD_NEXT_STEPS_KEYS) as string | undefined,
    owner: pickField(o.fields, FIELD_OWNER_KEYS) as string | undefined,
    description: pickField(o.fields, FIELD_DESCRIPTION_KEYS) as string | undefined,
    accountName: (accountFromInline ?? accountField) as string | undefined,
    httpLink: o.httpLink,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    fields: o.fields,
  };
}
