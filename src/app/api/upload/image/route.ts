import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/preview-user";
import { uploadBuffer } from "@/lib/cloudinary";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10MB per PRD

/**
 * POST /api/upload/image
 * multipart/form-data with field "file"
 * Returns { url, publicId, width, height }
 *
 * Used by the rich editor to upload images dropped/pasted/picked into a note.
 * The URL is then inlined as <img src="..."> in the note body.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getCurrentUserId();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large — max 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadBuffer(buffer, {
      folder: `command-center/${userId}/images`,
      resourceType: "image",
    });

    return NextResponse.json({
      url: result.secureUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("[upload image]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Image upload failed",
      },
      { status: 500 }
    );
  }
}

// App Router parses multipart/form-data via Request.formData() — no config
// export needed (the legacy pages-dir style triggers a deprecation error).
export const runtime = "nodejs";
export const maxDuration = 30;
