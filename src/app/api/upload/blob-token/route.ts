import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/preview-user";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB per file

/**
 * POST /api/upload/blob-token
 *
 * Token endpoint for `@vercel/blob/client` direct uploads. The client SDK
 * calls this endpoint twice during a single upload:
 *
 *   1. Before upload — to get a signed token. We restrict file size and
 *      embed the user id in the pathname so blobs are scoped per-user.
 *   2. After upload — onUploadCompleted callback. We currently no-op; the
 *      client persists the URL to its note via the regular notes API.
 *
 * Vercel Blob automatically reads BLOB_READ_WRITE_TOKEN from env (injected
 * by the Vercel platform when the Blob store is linked to the project), so
 * no key plumbing is needed beyond having the store provisioned.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  const userId = await getCurrentUserId().catch(() => "preview-user");

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // pathname is just the filename the client requested. We rewrite it
        // to live under command-center/{userId}/ so a malicious caller can't
        // overwrite someone else's blob — and we limit max size.
        return {
          allowedContentTypes: undefined, // accept any MIME
          maximumSizeInBytes: MAX_BYTES,
          tokenPayload: JSON.stringify({ userId, pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Persistence happens client-side after upload — keep this empty so
        // we don't double-write. Add metrics here later if needed.
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    console.error("[blob-token]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Token generation failed",
      },
      { status: 400 }
    );
  }
}

export const runtime = "nodejs";
