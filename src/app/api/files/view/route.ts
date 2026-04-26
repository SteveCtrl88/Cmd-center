import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/files/view?url=<cloudinary-url>
 *
 * Streams a Cloudinary file through our server with `Content-Disposition: inline`
 * so PDFs (and other browser-renderable types) open in the viewer instead of
 * being force-downloaded — Cloudinary's default for `raw` resources is
 * `attachment`, which the browser treats as "save as".
 *
 * Security: we only proxy URLs hosted on the user's own Cloudinary cloud,
 * preventing this endpoint from being used as an SSRF vehicle to internal
 * services or third-party hosts.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
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
    upstream = await fetch(target, {
      // Cloudinary serves public CDN URLs — no auth needed.
      cache: "no-store",
    });
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

  // Pull a sensible inline filename from the URL's last segment.
  const lastSeg = target.split("?")[0].split("/").pop() ?? "file";
  const filename = decodeURIComponent(lastSeg).replace(/[\r\n"]/g, "");

  // Pass through useful headers, but rewrite content-disposition.
  const upstreamCT = upstream.headers.get("content-type");
  const upstreamLen = upstream.headers.get("content-length");
  const headers = new Headers();
  if (upstreamCT) headers.set("content-type", upstreamCT);
  if (upstreamLen) headers.set("content-length", upstreamLen);
  headers.set("content-disposition", `inline; filename="${filename}"`);
  // Browser-side caching for 5 min to keep PDF re-opens snappy.
  headers.set("cache-control", "private, max-age=300");

  return new NextResponse(upstream.body, { status: 200, headers });
}

export const runtime = "nodejs";
