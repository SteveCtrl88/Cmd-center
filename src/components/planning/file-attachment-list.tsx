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
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { NoteAttachment } from "@/lib/api-client";
import {
  thumbUrl,
  isCloudinaryImageUrl,
  inlineViewUrl,
} from "@/lib/cloudinary-url";
import { uploadDirect } from "@/lib/cloudinary-upload";

interface FileAttachmentListProps {
  value: NoteAttachment[];
  onChange: (attachments: NoteAttachment[]) => void;
  /**
   * When true, hide the upload dropzone — delete (X) is still functional
   * so users can prune attachments from the read-only project view.
   */
  readonly?: boolean;
}

interface UploadingItem {
  id: string;
  name: string;
  size: number;
  contentType: string;
  progress: number;
}

export function FileAttachmentList({
  value,
  onChange,
  readonly = false,
}: FileAttachmentListProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState<UploadingItem[]>([]);
  const [confirmIndex, setConfirmIndex] = React.useState<number | null>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    // Spawn an UploadingItem per file so the UI reflects each in parallel.
    const items: UploadingItem[] = arr.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      contentType: file.type,
      progress: 0,
    }));
    setUploading((prev) => [...prev, ...items]);

    // Run uploads concurrently — each one resolves independently.
    await Promise.all(
      arr.map(async (file, i) => {
        const localId = items[i].id;
        try {
          const uploaded = await uploadDirect(file, {
            onProgress: (pct) => {
              setUploading((prev) =>
                prev.map((u) => (u.id === localId ? { ...u, progress: pct } : u))
              );
            },
          });
          // Remove from in-flight, append to value
          setUploading((prev) => prev.filter((u) => u.id !== localId));
          onChange([
            ...value,
            {
              publicId: uploaded.publicId,
              url: uploaded.url,
              name: uploaded.name,
              contentType: uploaded.contentType,
              size: uploaded.size,
            },
          ]);
        } catch (err) {
          setUploading((prev) => prev.filter((u) => u.id !== localId));
          toast.error(`${file.name}: ${(err as Error).message}`);
        }
      })
    );

    if (items.length > 0) {
      toast.success(
        `${items.length} file${items.length === 1 ? "" : "s"} uploaded`
      );
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

      {!readonly && (
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
            {uploading.length > 0
              ? `Uploading ${uploading.length} file${uploading.length === 1 ? "" : "s"}…`
              : "Drop files here, or paste — uploads go straight to Cloudinary"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Plus className="h-4 w-4" />
            Add files
          </Button>
        </div>
      )}

      {/* In-flight uploads with progress bars */}
      {uploading.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {uploading.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <FileTypeIcon type={u.contentType} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name}</div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-primary transition-[width] duration-100"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {humanSize(u.size)} · {u.progress}%
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Saved attachments */}
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
                href={inlineViewUrl(att.url, att.contentType)}
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
                onClick={() => setConfirmIndex(i)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmIndex !== null}
        onOpenChange={(open) => !open && setConfirmIndex(null)}
        title="Remove attachment?"
        description={
          confirmIndex !== null && value[confirmIndex] ? (
            <>
              <strong>{value[confirmIndex].name}</strong> will be removed from
              this note. The file stays in your Cloudinary account, but the
              link in this note is gone.
            </>
          ) : null
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (confirmIndex !== null) {
            onChange(value.filter((_, idx) => idx !== confirmIndex));
            setConfirmIndex(null);
          }
        }}
      />
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
