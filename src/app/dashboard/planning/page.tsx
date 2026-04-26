import { FileText, FolderOpen, Plus } from "lucide-react";
import { DEMO_PROJECTS } from "@/lib/demo-data";

export default function PlanningDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="text-sm text-muted-foreground">
            {DEMO_PROJECTS.length} projects · sorted by last updated
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <button
          className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Plus className="h-6 w-6" />
          <span>New Project</span>
        </button>

        {DEMO_PROJECTS.map((p) => (
          <article
            key={p.id}
            className="group flex h-44 cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:shadow-md"
          >
            <div className={`h-1.5 w-full ${p.color}`} />
            <div className="flex flex-1 flex-col p-4">
              <h3 className="font-semibold leading-tight">{p.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {p.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1">
                {p.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
                {p.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{p.tags.length - 3}
                  </span>
                )}
              </div>

              <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {p.noteCount}
                </span>
                <span className="flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  {p.driveCount}
                </span>
                <span className="ml-auto">
                  {new Date(p.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
