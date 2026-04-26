"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DesktopOnlyGuard } from "@/components/desktop-only";

function LoginContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard/sales";
  const error = params.get("error");

  return (
    <div className="hidden lg:flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Sales pipeline and research vault — solo build.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => signIn("google", { callbackUrl })}
          >
            <GoogleLogo />
            Continue with Google
          </Button>

          {error === "AccessDenied" && (
            <p className="mt-4 text-center text-sm text-destructive">
              That Google account isn&apos;t allowed to access this app.
            </p>
          )}
          {error && error !== "AccessDenied" && (
            <p className="mt-4 text-center text-sm text-destructive">
              Sign-in failed. Please try again.
            </p>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Drive read access is requested for linking documents.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <DesktopOnlyGuard />
      <Suspense fallback={null}>
        <LoginContent />
      </Suspense>
    </>
  );
}

function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8c1.8-3.4 5.4-5.7 9.6-5.7 2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.4 4.5 9.8 8.6 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5 0 9.6-1.7 13.1-4.6l-6-5c-2 1.3-4.5 2.1-7.1 2.1-5.2 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.4 16.3 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.1-2.2 4-4 5.3l6 5c-.4.4 6.7-4.9 6.7-14.3 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
