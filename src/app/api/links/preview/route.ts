import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import ogs from "open-graph-scraper";

const Body = z.object({ url: z.string().url() });

/**
 * POST /api/links/preview { url }
 * Returns OG metadata for a URL: title, description, thumbnail, siteName.
 * Falls back gracefully if a site doesn't expose OG tags.
 */
export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = await req.json();
    const parsed = Body.parse(body);
    url = parsed.url;
  } catch {
    return NextResponse.json(
      { error: "Invalid URL. Include the protocol (https://...)." },
      { status: 400 }
    );
  }

  try {
    const { result, error } = await ogs({
      url,
      timeout: 5000,
      fetchOptions: {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; CommandCenterBot/1.0; +https://cmd-center-two.vercel.app)",
        },
      },
    });

    if (error) {
      return NextResponse.json({
        url,
        title: hostnameOf(url),
        description: "",
        thumbnail: "",
        siteName: hostnameOf(url),
        partial: true,
      });
    }

    // OG scraper types are notoriously imprecise — coerce to a loose shape
    // and pull the first image URL we can find.
    const r = result as unknown as {
      requestUrl?: string;
      ogTitle?: string;
      twitterTitle?: string;
      ogDescription?: string;
      twitterDescription?: string;
      ogImage?: Array<{ url?: string }> | { url?: string };
      twitterImage?: Array<{ url?: string }>;
      ogSiteName?: string;
    };

    const firstImageUrl = (() => {
      if (Array.isArray(r.ogImage)) return r.ogImage[0]?.url;
      if (r.ogImage && typeof r.ogImage === "object") return r.ogImage.url;
      return undefined;
    })();

    return NextResponse.json({
      url: r.requestUrl ?? url,
      title: r.ogTitle ?? r.twitterTitle ?? hostnameOf(url),
      description: clip(r.ogDescription ?? r.twitterDescription ?? "", 200),
      thumbnail: firstImageUrl ?? r.twitterImage?.[0]?.url ?? "",
      siteName: r.ogSiteName ?? hostnameOf(url),
    });
  } catch (err) {
    console.error("[link preview]", err);
    return NextResponse.json({
      url,
      title: hostnameOf(url),
      description: "",
      thumbnail: "",
      siteName: hostnameOf(url),
      partial: true,
    });
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function clip(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
