"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpDown,
  FileText,
  FolderOpen,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api, type ProjectListItem } from "@/lib/api-client";
import { PROJECT_COLOR_CLASSES } from "@/lib/project-colors";
import type { ProjectColor } from "@/models/Project";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewProjectDialog } from "@/components/planning/new-project-dialog";

type Sort = "updated" | "alphabetical" | "created";
type View = "active" | "trash";

const SORT_LABEL: Record<Sort, string> = {
  updated: "Last updated",
  alphabetical: "Alphabetical",
  created: "Date created",
};

export function ProjectGrid() {
  const qc = useQueryClient();
  const [view, setView] = React.useState<View>("active");
  const [sort, setSort] = React.useState<Sort>("updated");
  const [newOpen, setNewOpen] = React.useState(false);

  const projectsQ = useQuery({
    queryKey: ["projects", view],
    queryFn: () =>
      api<{ projects: ProjectListItem[] }>(
        view === "trash" ? "/api/projects?include=trash" : "/api/projects"
      ),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) =>
      api(`/api/projects/${id}/restore`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project restored");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hardDeleteMut = useMutation({
    mutationFn: (id: string) =>
      api(`/api/projects/${id}?hard=1`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project permanently deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      api(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project moved to trash", {
        description: "Restore from the Trash view within 30 days.",
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sorted = React.useMemo(() => {
    const items = [...(projectsQ.data?.projects ?? [])];
    if (sort === "alphabetical")
      items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "created")
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    else
      items.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    return items;
  }, [projectsQ.data?.projects, sort]);

  const knownTags = React.useMemo(
    () =>
      Array.from(
        new Set(
          (projectsQ.data?.projects ?? [])
            .flatMap((p) => p.tags ?? [])
            .filter(Boolean)
        )
      ).sort(),
    [projectsQ.data?.projects]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="text-sm text-muted-foreground">
            {view === "trash" ? "Trash · " : ""}
            {sorted.length} project{sorted.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort: {SORT_LABEL[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setSort(s)}>
                  {SORT_LABEL[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {view === "active" ? "Active" : "Trash"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView("active")}>
                Active projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("trash")}>
                Trash (last 30 days)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {projectsQ.isLoading ? (
        <SkeletonGrid />
      ) : projectsQ.error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load projects: {(projectsQ.error as Error).message}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {view === "active" && (
            <button
              onClick={() => setNewOpen(true)}
              className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-6 w-6" />
              <span>New Project</span>
            </button>
          )}

          {sorted.map((p) => (
            <ProjectCard
              key={p._id}
              project={p}
              inTrash={view === "trash"}
              onDelete={() => deleteMut.mutate(p._id)}
              onRestore={() => restoreMut.mutate(p._id)}
              onHardDelete={() => {
                if (
                  confirm(
                    `Permanently delete "${p.name}"? This cannot be undone.`
                  )
                )
                  hardDeleteMut.mutate(p._id);
              }}
            />
          ))}

          {sorted.length === 0 && view === "trash" && (
            <p className="col-span-4 py-8 text-center text-sm text-muted-foreground">
              Trash is empty.
            </p>
          )}
          {sorted.length === 0 && view === "active" && (
            <p className="col-span-3 py-8 text-sm text-muted-foreground">
              No projects yet — click <strong>New Project</strong> to start.
            </p>
          )}
        </div>
      )}

      <NewProjectDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        knownTags={knownTags}
      />
    </div>
  );
}

function ProjectCard({
  project,
  inTrash,
  onDelete,
  onRestore,
  onHardDelete,
}: {
  project: ProjectListItem;
  inTrash: boolean;
  onDelete: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const colorKey = (project.color || "blue") as ProjectColor;
  const colorClasses = PROJECT_COLOR_CLASSES[colorKey];

  const inner = (
    <article className="group flex h-44 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className={`h-1.5 w-full ${colorClasses.bar}`} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{project.name}</h3>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {project.description || "No description"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {project.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {project.tags && project.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{project.tags.length - 3}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {project.noteCount}
          </span>
          <span className="flex items-center gap-1">
            <FolderOpen className="h-3 w-3" />
            {(project.driveRefs?.length as number) || 0}
          </span>
          <span className="ml-auto">
            {new Date(project.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </article>
  );

  if (inTrash) {
    return (
      <div className="relative">
        <div className="opacity-60 grayscale">{inner}</div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-lg border-t border-border bg-background/95 p-2">
          <button
            onClick={onRestore}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </button>
          <button
            onClick={onHardDelete}
            className="flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" /> Delete forever
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Link href={`/dashboard/planning/${project._id}`}>{inner}</Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Move "${project.name}" to trash?`)) onDelete();
        }}
        className="absolute right-2 top-3 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-destructive group-hover:opacity-100"
        aria-label={`Delete ${project.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-44 animate-pulse rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}
