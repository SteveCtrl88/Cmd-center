"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type NoteItem } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/planning/tag-input";
import { LinkInput, type LinkValue } from "@/components/planning/link-input";
import { MarkdownRenderer } from "@/components/planning/markdown-renderer";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Parent project id — required for create. */
  projectId: string;
  /** When editing, the existing note. When undefined, we create. */
  note?: NoteItem;
  knownTags?: string[];
}

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
  const [tab, setTab] = React.useState<"write" | "preview">("write");

  // Hydrate when opened with a note
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
      setTab("write");
    }
  }, [open, note]);

  const createMut = useMutation({
    mutationFn: () =>
      api<{ note: NoteItem }>("/api/notes", {
        method: "POST",
        json: {
          projectId,
          title: title.trim(),
          body,
          tags,
          links: links.map(stripLinkExtras),
        },
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
          links: links.map(stripLinkExtras),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (note) updateMut.mutate();
    else createMut.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
          <DialogDescription>
            Markdown supported. Add links and tags as needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's this note about?"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Body</Label>
              <div className="inline-flex rounded-md border border-input p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTab("write")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    tab === "write"
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setTab("preview")}
                  className={cn(
                    "rounded px-2 py-1 transition",
                    tab === "preview"
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Preview
                </button>
              </div>
            </div>

            {tab === "write" ? (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Markdown — **bold**, *italic*, lists, links, tables, code…"
                className="min-h-[180px] font-mono text-sm"
              />
            ) : (
              <div className="min-h-[180px] rounded-md border border-input bg-background p-3">
                <MarkdownRenderer>{body}</MarkdownRenderer>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput value={tags} onChange={setTags} suggestions={knownTags} />
          </div>

          <div className="space-y-2">
            <Label>Links</Label>
            <LinkInput value={links} onChange={setLinks} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Saving…" : note ? "Save changes" : "Create note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function stripLinkExtras(l: LinkValue) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _id, addedAt, ...rest } = l;
  return rest;
}
