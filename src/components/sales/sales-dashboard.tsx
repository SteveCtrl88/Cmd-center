"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  api,
  type DealsResponse,
  type DealItem,
  type DealTask,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lightfield's Opportunity pipeline ships with these 7 stages out of the
 * box (verified live against this account). The order matches what the
 * Lightfield UI shows so the Kanban feels familiar.
 *
 * If a deal's `stage` doesn't fit any of these (e.g. an account uses a
 * custom stage), it lands in the implicit "Other" column at the end.
 */
const STAGE_COLUMNS: Array<{
  key: string;
  label: string;
  /** Tailwind palette token used in tailwind.config.ts → bg-stage-* */
  palette: string;
}> = [
  { key: "lead", label: "Lead", palette: "prospecting" },
  { key: "qualification", label: "Qualification", palette: "qualified" },
  { key: "demo", label: "Demo", palette: "qualified" },
  { key: "trial", label: "Trial", palette: "proposal" },
  { key: "proposal", label: "Proposal", palette: "proposal" },
  { key: "won", label: "Won", palette: "won" },
  { key: "lost", label: "Lost", palette: "lost" },
];

function stageKey(stageRaw: string | undefined): string {
  const s = (stageRaw ?? "").toLowerCase().trim();
  if (!s) return "other";
  for (const col of STAGE_COLUMNS) {
    if (s === col.key) return col.key;
    if (s.includes(col.key)) return col.key;
  }
  // Map a few synonyms onto the standard columns
  if (s.includes("negotiat")) return "proposal";
  if (s.includes("closed-won") || s === "closed won") return "won";
  if (s.includes("closed-lost") || s === "closed lost") return "lost";
  return "other";
}

function formatAmount(amount: number | string | null): string | null {
  if (amount == null || amount === "") return null;
  if (typeof amount === "number") {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  }
  return String(amount);
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function formatDueDate(iso: string | undefined): {
  text: string;
  overdue: boolean;
} {
  if (!iso) return { text: "no due date", overdue: false };
  const due = new Date(iso);
  const ms = due.getTime() - Date.now();
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days < 0) {
    return { text: `${Math.abs(days)}d overdue`, overdue: true };
  }
  if (days === 0) return { text: "due today", overdue: false };
  if (days === 1) return { text: "due tomorrow", overdue: false };
  if (days < 7) return { text: `due in ${days}d`, overdue: false };
  return {
    text: `due ${due.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`,
    overdue: false,
  };
}

function bucketDeals(deals: DealItem[]): Record<string, DealItem[]> {
  const out: Record<string, DealItem[]> = {};
  for (const col of STAGE_COLUMNS) out[col.key] = [];
  out["other"] = [];
  for (const d of deals) {
    const k = stageKey(d.stage);
    (out[k] ?? out["other"]).push(d);
  }
  return out;
}

export function SalesDashboard() {
  const qc = useQueryClient();

  const dealsQ = useQuery({
    queryKey: ["deals"],
    queryFn: () => api<DealsResponse>("/api/deals"),
    refetchOnWindowFocus: false,
  });

  const refreshMut = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; fetched: number; fetchedTasks: number; upserted: number }>(
        "/api/lightfield/refresh",
        { method: "POST" }
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success(
        `Synced ${data.fetched} deal${data.fetched === 1 ? "" : "s"}` +
          (typeof data.fetchedTasks === "number"
            ? ` · ${data.fetchedTasks} task${data.fetchedTasks === 1 ? "" : "s"}`
            : "")
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deals = dealsQ.data?.deals ?? [];
  const lastSynced = dealsQ.data?.lastCachedAt;
  const buckets = bucketDeals(deals);
  const otherCount = buckets["other"]?.length ?? 0;
  const visibleColumns = otherCount > 0
    ? [...STAGE_COLUMNS, { key: "other", label: "Other", palette: "prospecting" }]
    : STAGE_COLUMNS;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">
            {dealsQ.isLoading
              ? "Loading…"
              : `${deals.length} deal${deals.length === 1 ? "" : "s"} · synced ${formatRelative(lastSynced)}`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refreshMut.mutate()}
          disabled={refreshMut.isPending}
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshMut.isPending && "animate-spin")}
          />
          {refreshMut.isPending ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {dealsQ.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load deals: {(dealsQ.error as Error).message}
        </div>
      ) : dealsQ.isLoading ? (
        <SkeletonBoard />
      ) : deals.length === 0 ? (
        <EmptyState
          onRefresh={() => refreshMut.mutate()}
          busy={refreshMut.isPending}
        />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(280px, 1fr))`,
            }}
          >
            {visibleColumns.map((col) => (
              <StageColumn
                key={col.key}
                label={col.label}
                palette={col.palette}
                deals={buckets[col.key] ?? []}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StageColumn({
  label,
  palette,
  deals,
}: {
  label: string;
  palette: string;
  deals: DealItem[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              `bg-stage-${palette}`
            )}
          />
          <h2 className="text-sm font-semibold">{label}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{deals.length}</span>
      </header>
      <div className="flex flex-col gap-3">
        {deals.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
            No deals
          </div>
        ) : (
          deals.map((d) => <DealCard key={d._id} deal={d} />)
        )}
      </div>
    </section>
  );
}

function DealCard({ deal }: { deal: DealItem }) {
  const amount = formatAmount(deal.amount);
  const openTasks = (deal.tasks ?? []).filter(
    (t) => t.status !== "COMPLETE" && t.status !== "CANCELLED"
  );

  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-4 shadow-sm">
      <header>
        <h3 className="truncate text-sm font-semibold leading-tight">
          {deal.name || deal.accountName || "Untitled deal"}
        </h3>
        {deal.accountName && deal.name && deal.accountName !== deal.name && (
          <p className="truncate text-xs text-muted-foreground">
            {deal.accountName}
          </p>
        )}
      </header>

      {(amount || deal.owner) && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {amount && <span className="font-medium text-foreground">{amount}</span>}
          {deal.owner && <span>Owner · {deal.owner}</span>}
        </div>
      )}

      {(deal.aiSummary || deal.description) && (
        <section className="mt-3 rounded-md bg-muted/40 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {deal.aiSummary ? "AI Summary" : "Description"}
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed">
            {deal.aiSummary || deal.description}
          </p>
        </section>
      )}

      {deal.nextSteps && (
        <section className="mt-3">
          <h4 className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Next steps
          </h4>
          <p className="text-xs leading-relaxed">{deal.nextSteps}</p>
        </section>
      )}

      <section className="mt-3">
        <h4 className="mb-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <span>Tasks</span>
          {openTasks.length > 0 && (
            <span>
              {openTasks.length} open
              {deal.tasks && deal.tasks.length > openTasks.length
                ? ` · ${deal.tasks.length - openTasks.length} done`
                : ""}
            </span>
          )}
        </h4>
        {!deal.tasks || deal.tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks</p>
        ) : (
          <ul className="space-y-1.5">
            {deal.tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {deal.lightfieldUpdatedAt
            ? formatRelative(deal.lightfieldUpdatedAt)
            : `cached ${formatRelative(deal.cachedAt)}`}
        </span>
        {deal.httpLink && (
          <a
            href={deal.httpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Lightfield
          </a>
        )}
      </footer>
    </article>
  );
}

function TaskRow({ task }: { task: DealTask }) {
  const due = formatDueDate(task.dueAt);
  const isDone = task.status === "COMPLETE";
  const isCancelled = task.status === "CANCELLED";
  const isInProgress = task.status === "IN_PROGRESS";

  const Icon = isDone ? CheckCircle2 : isCancelled ? XCircle : Circle;
  const iconCls = isDone
    ? "text-stage-won"
    : isCancelled
    ? "text-muted-foreground"
    : isInProgress
    ? "text-stage-qualified"
    : "text-muted-foreground";

  return (
    <li className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-1.5">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", iconCls)} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs leading-snug",
            (isDone || isCancelled) && "text-muted-foreground line-through"
          )}
          title={task.title}
        >
          {task.title || "(untitled task)"}
        </p>
        {!isDone && !isCancelled && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[10px]",
              due.overdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Clock className="h-2.5 w-2.5" />
            {due.text}
          </p>
        )}
      </div>
      {task.httpLink && (
        <a
          href={task.httpLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Open in Lightfield"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </li>
  );
}

function EmptyState({
  onRefresh,
  busy,
}: {
  onRefresh: () => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <h3 className="text-base font-medium">No deals cached yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pull the latest opportunities from Lightfield to populate this dashboard.
      </p>
      <Button className="mt-4 gap-2" onClick={onRefresh} disabled={busy}>
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        {busy ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}

function SkeletonBoard() {
  return (
    <div className="grid grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-8 animate-pulse rounded-md bg-muted/40" />
          <div className="h-40 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      ))}
    </div>
  );
}
