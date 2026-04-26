"use client";

import * as React from "react";
import {
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { NoteAttachment } from "@/lib/api-client";
import {
  thumbUrl,
  isCloudinaryImageUrl,
  inlineViewUrl,
} from "@/lib/cloudinary-url";

interface FileAttachmentListProps {
  value: NoteAttachment[];
  onChange: (attachments: NoteAttachment[]) => void;
}

export function FileAttachmentList({
  value,
  onChange,
}: FileAttachmentListProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setBusy(true);
    try {
      const uploaded: NoteAttachment[] = [];
      for (const file of arr) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload/file", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(`${file.name}: ${err.error ?? "upload failed"}`);
          continue;
        }
        const data = await res.json();
        uploaded.push({
          publicId: data.publicId,
          url: data.url,
          name: data.name,
          contentType: data.contentType,
          size: data.size,
        });
      }
      if (uploaded.length) {
        onChange([...value, ...uploaded]);
        toast.success(
          `${uploaded.length} file${uploaded.length === 1 ? "" : "s"} attached`
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add(
            "border-primary",
            "bg-primary/5",
            "border-solid"
          );
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove(
            "border-primary",
            "bg-primary/5",
            "border-solid"
          );
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove(
            "border-primary",
            "bg-primary/5",
            "border-solid"
          );
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        className="flex items-center justify-between gap-2 rounded-md border-2 border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors"
      >
        <span>
          {busy
            ? "Uploading…"
            : "Drop files here, or paste — 50MB max per file"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add files
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {value.map((att, i) => (
            <li
              key={`${att.publicId}-${i}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <AttachmentThumb attachment={att} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{att.name}</div>
                <div className="text-xs text-muted-foreground">
                  {humanSize(att.size)}
                </div>
              </div>
              <a
                href={inlineViewUrl(att.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="View in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={att.url}
                download={att.name}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((_, idx) => idx !== i))
                }
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders either a Cloudinary thumbnail (for image attachments) or a
 * type-appropriate file icon. Falls back to the icon if the thumbnail
 * fails to load.
 */
function AttachmentThumb({ attachment }: { attachment: NoteAttachment }) {
  const isImage =
    attachment.contentType?.startsWith("image/") ||
    isCloudinaryImageUrl(attachment.url);

  const [errored, setErrored] = React.useState(false);

  if (isImage && !errored) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={thumbUrl(attachment.url, 96)}
        alt={attachment.name}
        className="h-12 w-12 shrink-0 rounded object-cover"
        onError={() => setErrored(true)}
      />
    );
  }
  return <FileTypeIcon type={attachment.contentType} />;
}

function FileTypeIcon({ type }: { type: string }) {
  const cls = "h-12 w-12 shrink-0 rounded bg-muted p-3 text-muted-foreground";
  if (!type) return <File className={cls} />;
  if (type.startsWith("image/")) return <File className={cls} />;
  if (type.startsWith("video/")) return <FileVideo className={cls} />;
  if (type.startsWith("audio/")) return <FileAudio className={cls} />;
  if (
    type.includes("zip") ||
    type.includes("compressed") ||
    type.includes("archive")
  )
    return <FileArchive className={cls} />;
  if (
    type.includes("pdf") ||
    type.includes("text/") ||
    type.includes("document") ||
    type.includes("word") ||
    type.includes("sheet")
  )
    return <FileText className={cls} />;
  return <File className={cls} />;
}

function humanSize(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
