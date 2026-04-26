"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, type ProjectListItem, type NoteItem } from "@/lib/api-client";
import { PROJECT_COLOR_CLASSES } from "@/lib/project-colors";
import type { ProjectColor } from "@/models/Project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/planning/tag-input";
import { ColorSwatchPicker } from "@/components/planning/color-swatch-picker";
import { NoteEditor } from "@/components/planning/note-editor";
import { MarkdownRenderer } from "@/components/planning/markdown-renderer";

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const projectQ = useQuery({
    queryKey: ["project", projectId],
    queryFn: () =>
      api<{ project: ProjectListItem; notes: NoteItem[] }>(
        `/api/projects/${projectId}`
      ),
  });

  const updateMut = useMutation({
    mutationFn: (data: Partial<ProjectListItem>) =>
      api<{ project: ProjectListItem }>(`/api/projects/${projectId}`, {
        method: "PATCH",
        json: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      api(`/api/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Project moved to trash");
      qc.invalidateQueries({ queryKey: ["projects"] });
      router.push("/dashboard/planning");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<NoteItem | undefined>();

  // Inline edit state for the project header
  const [editingHeader, setEditingHeader] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editTags, setEditTags] = React.useState<string[]>([]);
  const [editColor, setEditColor] = React.useState<ProjectColor>("blue");

  React.useEffect(() => {
    const p = projectQ.data?.project;
    if (p && !editingHeader) {
      setEditName(p.name);
      setEditDesc(p.description ?? "");
      setEditTags(p.tags ?? []);
      setEditColor((p.color as ProjectColor) || "blue");
    }
  }, [projectQ.data?.project, editingHeader]);

  const knownTags = React.useMemo(() => {
    const all = new Set<string>();
    projectQ.data?.project?.tags?.forEach((t) => all.add(t));
    projectQ.data?.notes?.forEach((n) => n.tags?.forEach((t) => all.add(t)));
    return Array.from(all).sort();
  }, [projectQ.data]);

  if (projectQ.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (projectQ.error || !projectQ.data) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/planning"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Project not found, or it has been deleted.
        </div>
      </div>
    );
  }

  const { project, notes } = projectQ.data;
  const colorKey = (project.color || "blue") as ProjectColor;
  const colorClasses = PROJECT_COLOR_CLASSES[colorKey];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/planning"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            asChild
          >
            <a href={`/api/projects/${projectId}/export`}>
              <Download className="h-4 w-4" /> Export Markdown
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Move "${project.name}" to trash?`))
                deleteMut.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <header className="overflow-hidden rounded-lg border border-border bg-card">
        <div className={`h-1.5 w-full ${colorClasses.bar}`} />
        <div className="p-6">
          {editingHeader ? (
            <div className="space-y-4">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-semibold"
              />
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                rows={2}
              />
              <TagInput
                value={editTags}
                onChange={setEditTags}
                suggestions={knownTags}
                placeholder="Tags"
              />
              <ColorSwatchPicker value={editColor} onChange={setEditColor} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    updateMut.mutate(
                      {
                        name: editName.trim(),
                        description: editDesc,
                        tags: editTags,
                        color: editColor,
                      },
                      {
                        onSuccess: () => {
                          setEditingHeader(false);
                          toast.success("Project updated");
                        },
                      }
                    );
                  }}
                  disabled={updateMut.isPending || !editName.trim()}
                >
                  {updateMut.isPending ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingHeader(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {project.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    · {notes.length} note{notes.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingHeader(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Notes</h2>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => {
            setEditingNote(undefined);
            setEditorOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No notes yet. Click <strong>Add Note</strong> to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={() => {
                setEditingNote(note);
                setEditorOpen(true);
              }}
              onDelete={async () => {
                if (!confirm(`Delete "${note.title}"? This cannot be undone.`))
                  return;
                try {
                  await api(`/api/notes/${note._id}`, { method: "DELETE" });
                  qc.invalidateQueries({ queryKey: ["project", projectId] });
                  toast.success("Note deleted");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            />
          ))}
        </div>
      )}

      <NoteEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        note={editingNote}
        knownTags={knownTags}
      />
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: NoteItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const preview = (note.body || "").split("\n").slice(0, 2).join("\n");

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-3 p-4">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-start gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-medium leading-tight">{note.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {note.tags?.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5">
                  {t}
                </span>
              ))}
              {note.links?.length > 0 && (
                <span className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {note.links.length}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {countWords(note.body)} words
              </span>
              <span>
                · {new Date(note.updatedAt).toLocaleDateString()}
              </span>
            </div>
            {!expanded && preview && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {preview}
              </p>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onEdit}
            aria-label="Edit note"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            aria-label="Delete note"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {expanded && (
        <div className="border-t border-border p-4 pt-3 space-y-4">
          <MarkdownRenderer>{note.body}</MarkdownRenderer>

          {note.links?.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ExternalLink className="h-3 w-3" /> Links
              </h4>
              <ul className="space-y-2">
                {note.links.map((link, i) => (
                  <li
                    key={`${link.url}-${i}`}
                    className="flex items-start gap-3 rounded-md border border-border bg-background p-2 text-sm"
                  >
                    {link.thumbnail && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={link.thumbnail}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-medium hover:underline"
                      >
                        {link.title || link.url}
                      </a>
                      <div className="text-xs text-muted-foreground">
                        {link.siteName}
                      </div>
                      {link.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {link.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {note.aiSummary && (
            <div className="rounded-md bg-muted/40 p-3">
              <h4 className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" /> AI Summary
              </h4>
              <p className="text-sm">{note.aiSummary}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function countWords(s: string): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}
