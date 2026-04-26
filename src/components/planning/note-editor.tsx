"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, X, Maximize2 } from "lucide-react";
import { api, type NoteItem, type NoteAttachment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/planning/tag-input";
import { LinkInput, type LinkValue } from "@/components/planning/link-input";
import { RichEditor } from "@/components/planning/rich-editor";
import { FileAttachmentList } from "@/components/planning/file-attachment-list";

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent project id — required for create. */
  projectId: string;
  /** When editing, the existing note. When undefined, we create. */
  note?: NoteItem;
  knownTags?: string[];
}

/**
 * Full-screen note editor. Mounted as a fixed overlay above the dashboard
 * layout when `open` is true. Contains:
 *   - Title input (top bar)
 *   - Save / Cancel
 *   - Tags
 *   - Rich-text body (TipTap)
 *   - File attachments (drag-drop)
 *   - Link list with OG previews
 */
export function NoteEditor({
  open,
  onOpenChange,
  projectId,
  note,
  knownTags = [],
}: NoteEditorProps) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [links, setLinks] = React.useState<LinkValue[]>([]);
  const [attachments, setAttachments] = React.useState<NoteAttachment[]>([]);

  // Hydrate when opened or when the underlying note changes
  React.useEffect(() => {
    if (open) {
      setTitle(note?.title ?? "");
      setBody(note?.body ?? "");
      setTags(note?.tags ?? []);
      setLinks(
        note?.links?.map((l) => ({
          url: l.url,
          title: l.title,
          description: l.description,
          thumbnail: l.thumbnail,
          siteName: l.siteName,
        })) ?? []
      );
      setAttachments(note?.attachments ?? []);
    }
  }, [open, note]);

  const buildPayload = () => ({
    projectId,
    title: title.trim(),
    body,
    tags,
    links: links.map(({ _id, addedAt, ...rest }) => {
      void _id;
      void addedAt;
      return rest;
    }),
    attachments: attachments.map(({ _id, addedAt, ...rest }) => {
      void _id;
      void addedAt;
      return rest;
    }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      api<{ note: NoteItem }>("/api/notes", {
        method: "POST",
        json: buildPayload(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Note created");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      api<{ note: NoteItem }>(`/api/notes/${note!._id}`, {
        method: "PATCH",
        json: {
          title: title.trim(),
          body,
          tags,
          links: links.map(({ _id, addedAt, ...rest }) => {
            void _id;
            void addedAt;
            return rest;
          }),
          attachments: attachments.map(({ _id, addedAt, ...rest }) => {
            void _id;
            void addedAt;
            return rest;
          }),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Note saved");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (note) updateMut.mutate();
    else createMut.mutate();
  };

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
      // Cmd/Ctrl+S → save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, title, body, tags, links, attachments]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          aria-label="Close editor"
        >
          <X className="h-5 w-5" />
        </Button>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title…"
          className="h-10 flex-1 border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Maximize2 className="h-3 w-3" />
          <span className="hidden md:inline">⌘S to save · Esc to close</span>
        </div>

        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => handleSubmit()}
          disabled={isPending || !title.trim()}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Saving…" : note ? "Save" : "Create"}
        </Button>
      </header>

      {/* Body — scrollable, wide-but-readable column */}
      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-[920px] flex-col gap-6 px-6 py-6"
        >
          {/* Tags row */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Tags
            </Label>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={knownTags}
              placeholder="Add tags…"
            />
          </div>

          {/* Rich-text body */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Body
            </Label>
            <RichEditor
              value={body}
              onChange={setBody}
              placeholder="Start writing… drag images or files anywhere."
              className="min-h-[400px]"
              onAttachFile={async (file) => {
                // Files dropped onto the editor that aren't images are
                // treated as attachments.
                const fd = new FormData();
                fd.append("file", file);
                try {
                  const res = await fetch("/api/upload/file", {
                    method: "POST",
                    body: fd,
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error ?? "upload failed");
                  }
                  const data = await res.json();
                  setAttachments((prev) => [
                    ...prev,
                    {
                      publicId: data.publicId,
                      url: data.url,
                      name: data.name,
                      contentType: data.contentType,
                      size: data.size,
                    },
                  ]);
                  toast.success(`${file.name} attached`);
                } catch (err) {
                  toast.error(
                    `${file.name}: ${(err as Error).message ?? "upload failed"}`
                  );
                }
              }}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Attachments
            </Label>
            <FileAttachmentList
              value={attachments}
              onChange={setAttachments}
            />
          </div>

          {/* Links */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Links
            </Label>
            <LinkInput value={links} onChange={setLinks} />
          </div>

          <div className="h-12" />
        </form>
      </div>
    </div>
  );
}
