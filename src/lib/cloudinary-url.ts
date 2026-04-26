/**
 * Browser-safe helpers for transforming Cloudinary URLs without re-uploading.
 *
 * Cloudinary URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/folder/file.jpg
 *   https://res.cloudinary.com/<cloud>/raw/upload/v123/folder/file.pdf
 *
 * To insert transformations we splice them between `upload/` and the version:
 *   https://res.cloudinary.com/<cloud>/image/upload/c_fill,w_120,h_120,f_auto,q_auto/v123/folder/file.jpg
 */

/** Returns true if the URL is a Cloudinary image URL we can transform. */
export function isCloudinaryImageUrl(url: string): boolean {
  return /res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url);
}

/**
 * Inserts a transformation segment after `upload/`. If the URL already has
 * transformations, returns it unchanged (don't double-up).
 */
export function withTransformation(url: string, transform: string): string {
  if (!isCloudinaryImageUrl(url)) return url;
  // Already transformed?
  if (/\/image\/upload\/[a-z]_/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

/** Square thumbnail, auto-format, auto-quality. */
export function thumbUrl(url: string, size = 96): string {
  return withTransformation(url, `c_fill,w_${size},h_${size},f_auto,q_auto`);
}

/**
 * For Cloudinary URLs, wraps them in our /api/files/view proxy so the file
 * is served with `Content-Disposition: inline` (browser preview).
 * For Vercel Blob (or any other URL), returns the URL unchanged — Blob
 * already serves with proper inline disposition + content-type.
 */
export function inlineViewUrl(url: string, contentType?: string): string {
  if (typeof url !== "string" || !url) return url;
  // Only Cloudinary needs the proxy. Blob URLs (vercel-storage.com,
  // public.blob.vercel-storage.com) are already public + inline-serving.
  if (!/res\.cloudinary\.com/.test(url)) return url;
  const params = new URLSearchParams({ url });
  if (contentType) params.set("type", contentType);
  return `/api/files/view?${params.toString()}`;
}
