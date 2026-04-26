"use client";

import * as React from "react";
import { ExternalLink, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api, type LinkPreview } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LinkValue {
  _id?: string;
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  siteName: string;
  addedAt?: string;
}

interface LinkInputProps {
  value: LinkValue[];
  onChange: (links: LinkValue[]) => void;
}

/**
 * Paste a URL → click Add → calls /api/links/preview → shows a card with
 * thumbnail, title, domain, description. Remove via the X button.
 */
export function LinkInput({ value, onChange }: LinkInputProps) {
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const addLink = async () => {
    const url = draft.trim();
    if (!url) return;

    // Basic URL validation
    let normalized = url;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    if (value.some((l) => l.url === normalized)) {
      toast.error("Link already added");
      return;
    }

    setBusy(true);
    try {
      const preview = await api<LinkPreview>("/api/links/preview", {
        method: "POST",
        json: { url: normalized },
      });
      onChange([
        ...value,
        {
          url: preview.url,
          title: preview.title,
          description: preview.description,
          thumbnail: preview.thumbnail,
          siteName: preview.siteName,
        },
      ]);
      setDraft("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          placeholder="Paste a URL"
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addLink}
          disabled={busy || !draft.trim()}
          className="gap-2"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((link, i) => (
            <li
              key={`${link.url}-${i}`}
              className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
            >
              {link.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={link.thumbnail}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-muted">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {link.title || link.url}
                </a>
                <div className="text-xs text-muted-foreground truncate">
                  {link.siteName || hostname(link.url)}
                </div>
                {link.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {link.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((_, idx) => idx !== i))
                }
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove link"
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

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
