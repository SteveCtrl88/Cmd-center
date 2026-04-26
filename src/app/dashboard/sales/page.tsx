import { Calendar, CheckSquare, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMO_DEALS, STAGE_BADGE } from "@/lib/demo-data";

export default function SalesDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">
            Lightfield deals · synced 2h ago · {DEMO_DEALS.length} active
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {DEMO_DEALS.map((deal) => (
          <article
            key={deal.dealId}
            className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <header className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold leading-tight">
                {deal.customerName}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[deal.pipelineStage]}`}
              >
                {deal.pipelineStage}
              </span>
            </header>

            <p className="mt-1 text-xs text-muted-foreground">
              Assigned to {deal.assignedTo}
            </p>

            <section className="mt-4 rounded-md bg-muted/40 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                AI Summary
              </div>
              <p className="text-sm leading-relaxed">{deal.aiSummary}</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Last activity {formatDate(deal.lastActivity)}
              </p>
            </section>

            <section className="mt-4 flex-1">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Follow-ups ({deal.followUps.length})
              </h3>
              <ul className="space-y-1.5">
                {deal.followUps.length === 0 && (
                  <li className="text-sm text-muted-foreground">None</li>
                )}
                {deal.followUps.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{f.task}</div>
                      <div className="text-xs text-muted-foreground">
                        Due {formatDate(f.dueDate)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <button className="text-xs text-muted-foreground hover:text-foreground">
                View full notes
              </button>
              <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Sparkles className="h-3 w-3" />
                Regenerate
              </button>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
