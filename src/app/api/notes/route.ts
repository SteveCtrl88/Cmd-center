import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { withApiContext, apiError } from "@/lib/api-helpers";
import { Note } from "@/models/Note";
import { Project } from "@/models/Project";

const CreateNoteSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(200),
  body: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
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
    .optional()
    .default([]),
});

/** GET /api/notes?projectId=... */
export async function GET(req: NextRequest) {
  return withApiContext(async ({ userId }) => {
    const projectId = req.nextUrl.searchParams.get("projectId");
    const filter: Record<string, unknown> = { userId };
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Bad request: Invalid projectId");
      }
      filter.projectId = new mongoose.Types.ObjectId(projectId);
    }
    const notes = await Note.find(filter).sort({ updatedAt: -1 }).lean();
    return { notes };
  });
}

/** POST /api/notes */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateNoteSchema.parse(body);

    return withApiContext(async ({ userId }) => {
      if (!mongoose.Types.ObjectId.isValid(data.projectId)) {
        throw new Error("Bad request: Invalid projectId");
      }
      const projectId = new mongoose.Types.ObjectId(data.projectId);

      // Confirm the project exists and belongs to this user
      const project = await Project.findOne({
        _id: projectId,
        userId,
        deletedAt: null,
      });
      if (!project) throw new Error("Not found");

      const note = await Note.create({ ...data, projectId, userId });

      // Bump denormalized counts on the project
      await Project.updateOne(
        { _id: projectId },
        { $inc: { noteCount: 1 }, $set: { updatedAt: new Date() } }
      );

      return { note: note.toObject() };
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(new Error(`Bad request: ${err.errors[0]?.message}`));
    }
    return apiError(err);
  }
}
