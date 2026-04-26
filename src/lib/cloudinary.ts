import { v2 as cloudinary } from "cloudinary";

let configured = false;

/**
 * Lazy-init Cloudinary so missing env vars only blow up at upload time
 * (not at module load — keeps `next build` working without secrets).
 */
export function getCloudinary() {
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary is not configured (missing CLOUDINARY_* env vars)"
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

/** Upload a buffer to Cloudinary and return the secure URL + public_id. */
export async function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    publicId?: string;
    originalFilename?: string;
  }
) {
  const c = getCloudinary();

  return new Promise<{
    publicId: string;
    url: string;
    secureUrl: string;
    width?: number;
    height?: number;
    bytes: number;
    format: string;
    resourceType: string;
  }>((resolve, reject) => {
    const upload = c.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType ?? "auto",
        public_id: options.publicId,
        // Preserve the original extension on raw uploads so download names
        // look right.
        use_filename: !!options.originalFilename,
        unique_filename: true,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
          resourceType: result.resource_type,
        });
      }
    );
    upload.end(buffer);
  });
}

/** Best-effort delete; logs but doesn't throw if it fails. */
export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "raw" | "video" = "image"
) {
  try {
    const c = getCloudinary();
    await c.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error("[cloudinary delete]", publicId, err);
  }
}
