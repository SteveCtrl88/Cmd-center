"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type ProjectListItem } from "@/lib/api-client";
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
import { ColorSwatchPicker } from "@/components/planning/color-swatch-picker";
import { PROJECT_COLOR_OPTIONS } from "@/models/Project";

type Color = (typeof PROJECT_COLOR_OPTIONS)[number];

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knownTags?: string[];
}

export function NewProjectDialog({
  open,
  onOpenChange,
  knownTags = [],
}: NewProjectDialogProps) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState<Color>("blue");
  const [tags, setTags] = React.useState<string[]>([]);

  const reset = () => {
    setName("");
    setDescription("");
    setColor("blue");
    setTags([]);
  };

  const createMut = useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      color: Color;
      tags: string[];
    }) =>
      api<{ project: ProjectListItem }>("/api/projects", {
        method: "POST",
        json: data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMut.mutate({ name: name.trim(), description, color, tags });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Group related notes, links, and references.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Robotics R&D"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-desc">Description</Label>
            <Textarea
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short, optional"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={knownTags}
              placeholder="Add tags…"
            />
          </div>

          <div className="space-y-2">
            <Label>Accent color</Label>
            <ColorSwatchPicker value={color} onChange={setColor} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMut.isPending || !name.trim()}>
              {createMut.isPending ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
