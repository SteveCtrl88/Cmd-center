import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/files/view?url=<cloudinary-url>&type=<mime>
 *
 * Streams a Cloudinary file through our server with `Content-Disposition: inline`
 * so PDFs (and other browser-renderable types) open in the viewer instead of
 * being force-downloaded — Cloudinary's default for `raw` resources is
 * `attachment` plus `Content-Type: application/octet-stream`, which the
 * browser treats as "save as".
 *
 * Content-Type resolution (highest priority first):
 *   1. ?type=… query param (caller knows the original MIME — best)
 *   2. URL extension sniff (.pdf, .png, etc.)
 *   3. Upstream Content-Type (only if it's not the generic
 *      application/octet-stream that prevents inline rendering)
 *   4. application/octet-stream as a last resort
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

  let upstream: Response;
  try {
    upstream = await fetch(target, { cache: "no-store" });
  } catch (err) {
    console.error("[files/view] fetch failed", err);
    return NextResponse.json(
      { error: "Upstream fetch failed" },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
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
  // PDF viewer plugins generally want X-Content-Type-Options NOT to be
  // nosniff so they can probe — leaving the header off is fine here.
  headers.set("cache-control", "private, max-age=300");

  return new NextResponse(upstream.body, { status: 200, headers });
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

  // Use upstream only if it's not the generic catch-all that disables
  // inline rendering.
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
