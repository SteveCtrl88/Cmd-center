/**
 * Client-side direct-to-Cloudinary upload helpers.
 *
 * Why not POST to /api/upload/file? Vercel's serverless functions on the
 * Hobby plan reject request bodies larger than ~4.5MB, which blocks any
 * mid-sized PDF or image. The flow here is:
 *
 *   1. Ask our server for a one-time signed upload payload
 *      (POST /api/upload/signature — tiny request, never hits the limit)
 *   2. POST the file directly to api.cloudinary.com using that signature
 *      (Cloudinary's own limits apply: ~100MB raw, larger for video)
 *   3. Receive the secure URL + public_id
 *
 * XMLHttpRequest is used (rather than fetch) because it exposes upload
 * progress events natively, which we surface to the UI as a percentage.
 */

export type CloudinaryResourceType = "image" | "raw" | "video";

interface SignaturePayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string | null;
  resourceType: CloudinaryResourceType;
  uploadUrl: string;
}

interface CloudinaryResult {
  public_id: string;
  secure_url: string;
  url: string;
  resource_type: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export interface UploadedFile {
  publicId: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
  resourceType: string;
  width?: number;
  height?: number;
}

/** Pick the right Cloudinary resource_type from a MIME. Mirror of server logic. */
export function pickResourceType(mime: string): CloudinaryResourceType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "video";
  return "raw";
}

/**
 * Upload a single File directly to Cloudinary with progress events.
 * Caller can pass a `signal` (AbortSignal) to cancel mid-flight.
 */
export async function uploadDirect(
  file: File,
  options: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    /** Override resource_type. Defaults to MIME-based pick. */
    resourceType?: CloudinaryResourceType;
    /** Override the destination folder (otherwise derived server-side). */
    folder?: string;
  } = {}
): Promise<UploadedFile> {
  const resourceType = options.resourceType ?? pickResourceType(file.type || "");

  // Step 1 — get signed params from our server
  const sigRes = await fetch("/api/upload/signature", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      resourceType,
      folder: options.folder,
    }),
  });
  if (!sigRes.ok) {
    const err = await sigRes.json().catch(() => ({}));
    throw new Error(err?.error ?? "Failed to sign upload");
  }
  const sig: SignaturePayload = await sigRes.json();

  // Step 2 — POST directly to Cloudinary with progress events
  const result = await new Promise<CloudinaryResult>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    if (sig.publicId) fd.append("public_id", sig.publicId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl, true);

    if (options.signal) {
      const abort = () => xhr.abort();
      if (options.signal.aborted) abort();
      else options.signal.addEventListener("abort", abort, { once: true });
    }

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !options.onProgress) return;
      const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
      options.onProgress(pct);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as CloudinaryResult;
          options.onProgress?.(100);
          resolve(data);
        } catch {
          reject(new Error("Cloudinary returned invalid JSON"));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data?.error?.message) msg = data.error.message;
        } catch {
          // ignore
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    xhr.send(fd);
  });

  return {
    publicId: result.public_id,
    url: result.secure_url ?? result.url,
    name: file.name,
    contentType: file.type || `application/${result.format}`,
    size: result.bytes,
    resourceType: result.resource_type,
    width: result.width,
    height: result.height,
  };
}
