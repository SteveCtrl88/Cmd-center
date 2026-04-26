import type { ProjectColor } from "@/lib/project-meta";

/**
 * Maps a project's color enum to Tailwind classes for the accent bar
 * and the swatch button. Keep these in sync with the enum in models/Project.ts.
 *
 * NOTE: include the literal class names somewhere they'll be picked up by
 * Tailwind's content scan (this file). Don't try to compute them at runtime
 * via template literals — Tailwind would purge the unused ones.
 */
export const PROJECT_COLOR_CLASSES: Record<
  ProjectColor,
  { bar: string; swatch: string; ring: string }
> = {
  blue: { bar: "bg-blue-500", swatch: "bg-blue-500", ring: "ring-blue-500" },
  emerald: {
    bar: "bg-emerald-500",
    swatch: "bg-emerald-500",
    ring: "ring-emerald-500",
  },
  purple: {
    bar: "bg-purple-500",
    swatch: "bg-purple-500",
    ring: "ring-purple-500",
  },
  amber: { bar: "bg-amber-500", swatch: "bg-amber-500", ring: "ring-amber-500" },
  rose: { bar: "bg-rose-500", swatch: "bg-rose-500", ring: "ring-rose-500" },
  indigo: {
    bar: "bg-indigo-500",
    swatch: "bg-indigo-500",
    ring: "ring-indigo-500",
  },
  cyan: { bar: "bg-cyan-500", swatch: "bg-cyan-500", ring: "ring-cyan-500" },
  orange: {
    bar: "bg-orange-500",
    swatch: "bg-orange-500",
    ring: "ring-orange-500",
  },
};
