import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getCurrentUserId } from "@/lib/preview-user";
import { Project } from "@/models/Project";
import { Note } from "@/models/Note";

/**
 * GET /api/projects/[id]/export
 * Returns the project + all notes formatted as a single Markdown file.
 * Triggers a download in the browser via Content-Disposition.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const userId = await getCurrentUserId();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { error: "Invalid project id" },
        { status: 400 }
      );
    }

    const _id = new mongoose.Types.ObjectId(params.id);
    const project = await Project.findOne({
      _id,
      userId,
      deletedAt: null,
    }).lean();

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const notes = await Note.find({ projectId: _id, userId })
      .sort({ updatedAt: -1 })
      .lean();

    const markdown = renderProjectMarkdown(project, notes);

    const safeName = project.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    const filename = `${safeName}-${new Date().toISOString().split("T")[0]}.md`;

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export]", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

// Casting these to `any` keeps the helper concise — we control the producer
// so the field set is well known.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderProjectMarkdown(project: any, notes: any[]): string {
  const lines: string[] = [];
  lines.push(`# ${project.name}`);
  lines.push("");
  if (project.description) {
    lines.push(`> ${project.description}`);
    lines.push("");
  }

  const meta: string[] = [];
  if (project.tags?.length) meta.push(`**Tags:** ${project.tags.join(", ")}`);
  meta.push(`**Notes:** ${notes.length}`);
  meta.push(
    `**Last updated:** ${new Date(project.updatedAt).toLocaleString()}`
  );
  lines.push(meta.join(" · "));
  lines.push("");
  lines.push("---");
  lines.push("");

  if (notes.length === 0) {
    lines.push("_No notes yet._");
  } else {
    for (const note of notes) {
      lines.push(`## ${note.title}`);
      lines.push("");
      const noteMeta: string[] = [];
      if (note.tags?.length) noteMeta.push(`Tags: ${note.tags.join(", ")}`);
      noteMeta.push(
        `Updated ${new Date(note.updatedAt).toLocaleDateString()}`
      );
      lines.push(`*${noteMeta.join(" · ")}*`);
      lines.push("");

      if (note.body) {
        lines.push(note.body);
        lines.push("");
      }

      if (note.links?.length) {
        lines.push(`### Links`);
        for (const link of note.links) {
          const title = link.title || link.url;
          lines.push(`- [${title}](${link.url})`);
          if (link.description) lines.push(`  - ${link.description}`);
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("");
    }
  }

  lines.push(
    `_Exported from Command Center on ${new Date().toLocaleString()}._`
  );
  return lines.join("\n");
}
