"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_COLOR_CLASSES } from "@/lib/project-colors";
import { PROJECT_COLOR_OPTIONS, type ProjectDoc } from "@/models/Project";

type Color = NonNullable<ProjectDoc["color"]>;

interface ColorSwatchPickerProps {
  value: Color;
  onChange: (color: Color) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROJECT_COLOR_OPTIONS.map((c) => {
        const selected = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Select ${c} color`}
            className={cn(
              "h-7 w-7 rounded-full transition-transform hover:scale-110",
              PROJECT_COLOR_CLASSES[c].swatch,
              selected && "ring-2 ring-offset-2 ring-offset-background ring-foreground"
            )}
          >
            {selected && (
              <Check className="mx-auto h-4 w-4 text-white" strokeWidth={3} />
            )}
          </button>
        );
      })}
    </div>
  );
}
