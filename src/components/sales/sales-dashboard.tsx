"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  CheckSquare,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { api, type DealsResponse, type DealItem } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Maps stage strings (whatever your Lightfield account uses) to one of our
 * pre-defined stage palette colors. Falls back to "prospecting" gray for
 * anything we don't recognize.
 */
function stageBadge(stageRaw: string | undefined): {
  label: string;
  cls: string;
} {
  const stage = (stageRaw ?? "").toLowerCase();
  const map: Array<{ match: RegExp; key: string }> = [
    { match: /closed.*won|won/i, key: "won" },
    { match: /closed.*lost|lost/i, key: "lost" },
    { match: /negotiat/i, key: "negotiation" },
    { match: /proposal|propos/i, key: "proposal" },
    { match: /qualif/i, key: "qualified" },
    { match: /prospect|new|lead/i, key: "prospecting" },
  ];
  const hit = map.find((m) => m.match.test(stage));
  const key = hit?.key ?? "prospecting";
  const cls =
    `bg-stage-${key}/15 text-stage-${key} border border-stage-${key}/30`;
  return { label: stageRaw || "Prospecting", cls };
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

export function SalesDashboard() {
  const qc = useQueryClient();

  const dealsQ = useQuery({
    queryKey: ["deals"],
    queryFn: () => api<DealsResponse>("/api/deals"),
    refetchOnWindowFocus: false,
  });

  const refreshMut = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; fetched: number; upserted: number }>(
        "/api/lightfield/refresh",
        { method: "POST" }
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success(`Synced ${data.fetched} deal${data.fetched === 1 ? "" : "s"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deals = dealsQ.data?.deals ?? [];
  const lastSynced = dealsQ.data?.lastCachedAt;

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
            className={cn(
              "h-4 w-4",
              refreshMut.isPending && "animate-spin"
            )}
          />
          {refreshMut.isPending ? "Syncing…" : "Refresh"}
        </Button>
      </div>

      {dealsQ.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load deals: {(dealsQ.error as Error).message}
        </div>
      ) : dealsQ.isLoading ? (
        <SkeletonGrid />
      ) : deals.length === 0 ? (
        <EmptyState onRefresh={() => refreshMut.mutate()} busy={refreshMut.isPending} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {deals.map((d) => (
            <DealCard key={d._id} deal={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: DealItem }) {
  const stage = stageBadge(deal.stage);
  const amount = formatAmount(deal.amount);

  return (
    <article className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold leading-tight">
            {deal.name || deal.accountName || "Untitled deal"}
          </h2>
          {deal.accountName && deal.name && deal.accountName !== deal.name && (
            <p className="truncate text-xs text-muted-foreground">
              {deal.accountName}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            stage.cls
          )}
        >
          {stage.label}
        </span>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {amount && <span className="font-medium text-foreground">{amount}</span>}
        {deal.owner && (
          <span>
            <span className="text-muted-foreground">Owner</span> {deal.owner}
          </span>
        )}
      </div>

      {(deal.aiSummary || deal.description) && (
        <section className="mt-4 rounded-md bg-muted/40 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {deal.aiSummary ? "AI Summary" : "Description"}
          </div>
          <p className="text-sm leading-relaxed">
            {deal.aiSummary || deal.description}
          </p>
        </section>
      )}

      {deal.nextSteps && (
        <section className="mt-4">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next steps
          </h3>
          <p className="flex items-start gap-2 text-sm">
            <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">{deal.nextSteps}</span>
          </p>
        </section>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {deal.lightfieldUpdatedAt
            ? `Updated ${formatRelative(deal.lightfieldUpdatedAt)}`
            : `Cached ${formatRelative(deal.cachedAt)}`}
        </span>
        {deal.httpLink && (
          <a
            href={deal.httpLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Lightfield
          </a>
        )}
      </footer>
    </article>
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
      <Button
        className="mt-4 gap-2"
        onClick={onRefresh}
        disabled={busy}
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
        {busy ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}
