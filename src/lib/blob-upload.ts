"use client";

import { upload } from "@vercel/blob/client";
import type { UploadedFile } from "@/lib/cloudinary-upload";

/**
 * Direct-to-Vercel-Blob upload for non-image attachments. Used instead of
 * Cloudinary for files because Cloudinary's free tier blocks PDF/ZIP
 * delivery by default — Blob has no such restriction.
 *
 * Native progress events arrive via `onUploadProgress`.
 */
export async function uploadToBlob(
  file: File,
  options: {
    onProgress?: (percent: number) => void;
  } = {}
): Promise<UploadedFile> {
  // Vercel Blob preserves the original filename, but namespacing under a
  // folder keeps things tidy in the dashboard browser.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `attachments/${Date.now()}-${safeName}`;

  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload/blob-token",
    onUploadProgress: (e) => {
      if (!options.onProgress) return;
      // SDK reports `percentage` 0–100 (number, may include decimals)
      options.onProgress(Math.min(99, Math.round(e.percentage)));
    },
  });

  options.onProgress?.(100);

  return {
    publicId: blob.pathname,
    url: blob.url,
    name: file.name,
    contentType: file.type || blob.contentType || "application/octet-stream",
    size: file.size,
    resourceType: "blob",
  };
}
