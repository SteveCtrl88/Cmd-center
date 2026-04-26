import { Monitor } from "lucide-react";

/**
 * Renders a static "please use a desktop browser" panel that's only visible
 * below the 1024px breakpoint, per PRD §1.2 (no mobile/tablet support in v1).
 *
 * The actual app content sits in a sibling element with the inverse breakpoint
 * (`hidden lg:block`), so the two never overlap.
 */
export function DesktopOnlyGuard() {
  return (
    <div className="lg:hidden flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <Monitor className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Please use a desktop browser</h1>
        <p className="text-sm text-muted-foreground">
          Command Center is optimized for desktop only (min-width 1024px).
          Open this app on a larger screen to continue.
        </p>
      </div>
    </div>
  );
}
