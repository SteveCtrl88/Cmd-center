import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/preview-user";

/**
 * Wraps an API handler with: DB connection, current user resolution, and
 * standard error responses. Keeps every route handler a few lines.
 */
export async function withApiContext<T>(
  fn: (ctx: { userId: string }) => Promise<T>
): Promise<NextResponse> {
  try {
    await connectToDatabase();
    const userId = await getCurrentUserId();
    const result = await fn({ userId });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}

export function apiError(err: unknown) {
  console.error("[api]", err);
  if (err instanceof Error) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (err.message.startsWith("Bad request:")) {
      return NextResponse.json(
        { error: err.message.replace("Bad request: ", "") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
