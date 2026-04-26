import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { withApiContext, apiError } from "@/lib/api-helpers";
import { Project, PROJECT_COLOR_OPTIONS } from "@/models/Project";
import { Note } from "@/models/Note";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  color: z.enum(PROJECT_COLOR_OPTIONS).optional(),
  tags: z.array(z.string()).optional(),
});

function objectIdOrThrow(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Bad request: Invalid project id");
  }
  return new mongoose.Types.ObjectId(id);
}

/** GET /api/projects/[id] — project + its notes */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiContext(async ({ userId }) => {
    const _id = objectIdOrThrow(params.id);
    const project = await Project.findOne({ _id, userId, deletedAt: null }).lean();
    if (!project) throw new Error("Not found");

    const notes = await Note.find({ projectId: _id, userId })
      .sort({ updatedAt: -1 })
      .lean();

    return { project, notes };
  });
}

/** PATCH /api/projects/[id] — update metadata */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const _id = objectIdOrThrow(params.id);
    const body = await req.json();
    const data = UpdateProjectSchema.parse(body);

    return withApiContext(async ({ userId }) => {
      const project = await Project.findOneAndUpdate(
        { _id, userId, deletedAt: null },
        { $set: data },
        { new: true }
      ).lean();
      if (!project) throw new Error("Not found");
      return { project };
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(new Error(`Bad request: ${err.errors[0]?.message}`));
    }
    return apiError(err);
  }
}

/**
 * DELETE /api/projects/[id]
 * Soft-deletes by default (sets deletedAt). To hard-delete (and remove all
 * child notes), pass ?hard=1.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiContext(async ({ userId }) => {
    const _id = objectIdOrThrow(params.id);
    const hard = req.nextUrl.searchParams.get("hard") === "1";

    if (hard) {
      const result = await Project.deleteOne({ _id, userId });
      if (result.deletedCount === 0) throw new Error("Not found");
      await Note.deleteMany({ projectId: _id, userId });
      return { hardDeleted: true };
    }

    const project = await Project.findOneAndUpdate(
      { _id, userId, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();
    if (!project) throw new Error("Not found");
    return { softDeleted: true, project };
  });
}
