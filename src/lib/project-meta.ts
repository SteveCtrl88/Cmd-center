/**
 * Browser-safe project metadata. Importing from @/models/Project pulls
 * mongoose into the bundle, which crashes in the browser. Anything that
 * client components need lives here.
 */

export const PROJECT_COLOR_OPTIONS = [
  "blue",
  "emerald",
  "purple",
  "amber",
  "rose",
  "indigo",
  "cyan",
  "orange",
] as const;

export type ProjectColor = (typeof PROJECT_COLOR_OPTIONS)[number];
