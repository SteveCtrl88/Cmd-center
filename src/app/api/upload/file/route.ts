import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/preview-user";
import { uploadBuffer } from "@/lib/cloudinary";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB for general attachments

/**
 * Pick the right Cloudinary resource_type for a given MIME.
 *  - image/*  → image  (gets transformations, thumbnails, etc.)
 *  - video/*  → video  (Cloudinary uses "video" for video AND audio)
 *  - audio/*  → video  (same as above)
 *  - anything else (PDF, docs, archives) → raw
 *
 * Critical: PDFs MUST be uploaded as "raw" — Cloudinary's default delivery
 * security blocks PDF/ZIP delivery from "image" resources, which is what
 * `auto` was picking. Raw uploads preserve the original extension and serve
 * cleanly with no further config.
 */
function pickResourceType(mime: string): "image" | "video" | "raw" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "video";
  return "raw";
}

/**
 * POST /api/upload/file
 * multipart/form-data with field "file"
 * Returns { url, publicId, name, contentType, size, resourceType }
 *
 * For non-image attachments — PDFs, docs, archives, etc. Rendered as a card
 * row beneath the note body. Images dragged here also work; they're stored
 * with resource_type=image so we can generate thumbnails.
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

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large — max 50MB" },
        { status: 400 }
      );
    }

    const resourceType = pickResourceType(file.type || "");
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadBuffer(buffer, {
      folder: `command-center/${userId}/files`,
      resourceType,
      originalFilename: file.name,
    });

    return NextResponse.json({
      url: result.secureUrl,
      publicId: result.publicId,
      name: file.name,
      contentType: file.type || `application/${result.format}`,
      size: result.bytes,
      resourceType: result.resourceType,
    });
  } catch (err) {
    console.error("[upload file]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "File upload failed",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
