import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCloudinary } from "@/lib/cloudinary";
import { getCurrentUserId } from "@/lib/preview-user";

const Body = z.object({
  resourceType: z.enum(["image", "raw", "video"]).default("raw"),
  folder: z.string().optional(),
  publicId: z.string().optional(),
});

/**
 * POST /api/upload/signature
 * Returns a signed upload payload the client uses to upload DIRECTLY to
 * Cloudinary, bypassing Vercel's 4.5MB serverless body limit. Without this,
 * uploads fail for any file larger than ~4MB on the Hobby plan.
 *
 * Returns:
 *   {
 *     cloudName, apiKey,           // public — caller posts to Cloudinary
 *     timestamp, signature,        // signed params (must be sent verbatim)
 *     folder, resourceType,        // params we signed
 *     uploadUrl                    // POST target
 *   }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const json = await req.json().catch(() => ({}));
    const { resourceType, folder, publicId } = Body.parse(json);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }

    const c = getCloudinary();

    const finalFolder =
      folder ??
      (resourceType === "image"
        ? `command-center/${userId}/images`
        : `command-center/${userId}/files`);

    const timestamp = Math.round(Date.now() / 1000);

    // Cloudinary signs an alphabetically-sorted parameter string. Only
    // params that affect the upload should be signed.
    const paramsToSign: Record<string, string | number> = {
      folder: finalFolder,
      timestamp,
    };
    if (publicId) paramsToSign.public_id = publicId;

    const signature = c.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: finalFolder,
      publicId: publicId ?? null,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Bad request" },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[upload signature]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
