import { NextRequest, NextResponse } from "next/server";
import { getCloudinary } from "@/lib/cloudinary";

/**
 * GET /api/files/view?url=<cloudinary-url>&type=<mime>
 *
 * Streams a Cloudinary file through our server with `Content-Disposition: inline`
 * so PDFs (and other browser-renderable types) open in the viewer instead of
 * being force-downloaded.
 *
 * Why we re-sign the URL: Cloudinary accounts can be configured to require
 * authentication for delivery URLs (strict mode / restricted media types).
 * In that case the raw CDN URL we stored returns 401. Re-signing with our
 * API_SECRET via the SDK produces a `s--<signature>--/` URL that's accepted
 * regardless of strict-mode settings, with no dashboard tweaks required.
 *
 * Security: only proxies URLs hosted on the user's own Cloudinary cloud,
 * preventing this endpoint from being used as an SSRF vehicle.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  const explicitType = req.nextUrl.searchParams.get("type");

  if (!target) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return NextResponse.json(
      { error: "Cloudinary not configured" },
      { status: 500 }
    );
  }

  const allowedPrefix = `https://res.cloudinary.com/${cloudName}/`;
  if (!target.startsWith(allowedPrefix)) {
    return NextResponse.json(
      { error: "URL is not from this Cloudinary account" },
      { status: 400 }
    );
  }

  const fetchUrl = signCloudinaryUrl(target, cloudName) ?? target;

  let upstream: Response;
  try {
    upstream = await fetch(fetchUrl, { cache: "no-store" });
  } catch (err) {
    console.error("[files/view] fetch failed", err);
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    // If the signed fetch failed, fall back to the bare URL — covers the
    // case where the asset really is public and the parser misread the URL.
    if (fetchUrl !== target) {
      try {
        upstream = await fetch(target, { cache: "no-store" });
      } catch {
        // ignore — handled below
      }
    }
  }

  if (!upstream.ok || !upstream.body) {
    const bodyText = await upstream.text().catch(() => "");
    console.error(
      "[files/view] upstream",
      upstream.status,
      target,
      bodyText.slice(0, 200)
    );
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const lastSeg = target.split("?")[0].split("/").pop() ?? "file";
  const filename = decodeURIComponent(lastSeg).replace(/[\r\n"]/g, "");

  const upstreamCT = upstream.headers.get("content-type");
  const upstreamLen = upstream.headers.get("content-length");

  const contentType = resolveContentType({
    explicit: explicitType,
    url: target,
    upstream: upstreamCT,
  });

  const headers = new Headers();
  headers.set("content-type", contentType);
  if (upstreamLen) headers.set("content-length", upstreamLen);
  headers.set("content-disposition", `inline; filename="${filename}"`);
  headers.set("cache-control", "private, max-age=300");

  return new NextResponse(upstream.body, { status: 200, headers });
}

/**
 * Parse a Cloudinary delivery URL and re-sign via the SDK. Returns null if
 * the URL doesn't match the expected shape (in which case we just fetch as-is).
 */
function signCloudinaryUrl(url: string, cloudName: string): string | null {
  // Pattern: https://res.cloudinary.com/<cloud>/<resource_type>/upload/[<transforms>/]?[v<version>/]<publicId>
  const escaped = cloudName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(
    `^https?://res\\.cloudinary\\.com/${escaped}/(image|raw|video)/upload/` +
      // Optional transformation/signature segments — skip them
      `(?:(?:[a-z]_[^/]+|s--[^/]+--)/)*?` +
      `(?:v(\\d+)/)?` +
      `(.+?)$`
  );
  const m = url.match(re);
  if (!m) return null;

  const resourceType = m[1] as "image" | "raw" | "video";
  const version = m[2] ? parseInt(m[2], 10) : undefined;
  const publicId = m[3];

  try {
    const c = getCloudinary();
    return c.url(publicId, {
      resource_type: resourceType,
      type: "upload",
      sign_url: true,
      secure: true,
      version,
    });
  } catch (err) {
    console.error("[files/view] signCloudinaryUrl failed", err);
    return null;
  }
}

function resolveContentType({
  explicit,
  url,
  upstream,
}: {
  explicit: string | null;
  url: string;
  upstream: string | null;
}): string {
  if (explicit && /^[a-z]+\/[a-z0-9.+-]+/i.test(explicit)) return explicit;

  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const sniffed = MIME_BY_EXT[ext];
  if (sniffed) return sniffed;

  if (upstream && !/^application\/octet-stream/i.test(upstream)) return upstream;
  return upstream || "application/octet-stream";
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  json: "application/json",
  html: "text/html; charset=utf-8",
  xml: "application/xml",
  zip: "application/zip",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export const runtime = "nodejs";
