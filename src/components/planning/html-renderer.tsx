"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders HTML produced by the rich editor. The HTML is server-source
 * (entered by the authenticated user), so we trust it. If we ever expose
 * notes to other users, swap dangerouslySetInnerHTML for DOMPurify.sanitize.
 */
export function HtmlRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  if (!children?.trim() || children.trim() === "<p></p>") {
    return (
      <p className={cn("text-sm italic text-muted-foreground", className)}>
        No content yet.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-foreground",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-p:my-2 prose-li:my-0.5",
        "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded prose-pre:bg-muted prose-pre:p-3",
        "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:italic",
        "prose-img:rounded-md prose-img:max-w-full prose-img:my-3",
        "dark:prose-invert",
        className
      )}
      dangerouslySetInnerHTML={{ __html: children }}
    />
  );
}
