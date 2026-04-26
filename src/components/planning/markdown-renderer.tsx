"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Lightweight markdown renderer used for note bodies. Supports GFM
 * (tables, strikethrough, task lists). Headings and code blocks are
 * styled inline via Tailwind so we don't need typography plugin yet.
 */
export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  if (!children?.trim()) {
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
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-p:my-2 prose-li:my-0.5",
        "prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline",
        "prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:rounded prose-pre:bg-muted prose-pre:p-3",
        "prose-blockquote:border-l-2 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:italic",
        "dark:prose-invert",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
