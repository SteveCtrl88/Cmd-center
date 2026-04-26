"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  /** Suggestions shown below the input as the user types. */
  suggestions?: string[];
}

/**
 * Chip-style tag input. Press Enter or comma to commit the current value.
 * Backspace on an empty input removes the last tag.
 */
export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag…",
  className,
  suggestions = [],
}: TagInputProps) {
  const [draft, setDraft] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const filteredSuggestions = React.useMemo(() => {
    if (!draft) return [];
    const q = draft.toLowerCase();
    return suggestions.filter(
      (s) => s.toLowerCase().includes(q) && !value.includes(s)
    ).slice(0, 5);
  }, [draft, suggestions, value]);

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              removeTag(value.length - 1);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-popover py-1 text-sm shadow-md">
          {filteredSuggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-accent"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
