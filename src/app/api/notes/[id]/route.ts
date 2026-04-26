import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { withApiContext, apiError } from "@/lib/api-helpers";
import { Note } from "@/models/Note";
import { Project } from "@/models/Project";

const UpdateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  tags: z.array(z.string()).optional(),
  links: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().optional().default(""),
        description: z.string().optional().default(""),
        thumbnail: z.string().optional().default(""),
        siteName: z.string().optional().default(""),
      })
    )
    .optional(),
});

function objectIdOrThrow(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Bad request: Invalid note id");
  }
  return new mongoose.Types.ObjectId(id);
}

/** GET /api/notes/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiContext(async ({ userId }) => {
    const _id = objectIdOrThrow(params.id);
    const note = await Note.findOne({ _id, userId }).lean();
    if (!note) throw new Error("Not found");
    return { note };
  });
}

/** PATCH /api/notes/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const _id = objectIdOrThrow(params.id);
    const body = await req.json();
    const data = UpdateNoteSchema.parse(body);

    return withApiContext(async ({ userId }) => {
      const note = await Note.findOneAndUpdate(
        { _id, userId },
        { $set: data },
        { new: true }
      ).lean();
      if (!note) throw new Error("Not found");

      // Bump project's updatedAt so the grid reflects recent activity
      await Project.updateOne(
        { _id: note.projectId },
        { $set: { updatedAt: new Date() } }
      );

      return { note };
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(new Error(`Bad request: ${err.errors[0]?.message}`));
    }
    return apiError(err);
  }
}

/** DELETE /api/notes/[id] — hard delete (notes don't soft-delete in MVP) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiContext(async ({ userId }) => {
    const _id = objectIdOrThrow(params.id);
    const note = await Note.findOneAndDelete({ _id, userId }).lean();
    if (!note) throw new Error("Not found");

    await Project.updateOne(
      { _id: note.projectId },
      {
        $inc: { noteCount: -1 },
        $set: { updatedAt: new Date() },
      }
    );

    return { deleted: true };
  });
}
