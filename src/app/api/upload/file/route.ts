import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/preview-user";
import { uploadBuffer } from "@/lib/cloudinary";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB for general attachments

/**
 * POST /api/upload/file
 * multipart/form-data with field "file"
 * Returns { url, publicId, name, contentType, size }
 *
 * For non-image attachments — PDFs, docs, archives, etc. Rendered as a card
 * row beneath the note body.
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

    const buffer = Buffer.from(await file.arrayBuffer());

    // resource_type "auto" lets Cloudinary handle images, video, and raw.
    const result = await uploadBuffer(buffer, {
      folder: `command-center/${userId}/files`,
      resourceType: "auto",
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
