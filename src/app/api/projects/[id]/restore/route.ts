import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { withApiContext } from "@/lib/api-helpers";
import { Project } from "@/models/Project";

/** POST /api/projects/[id]/restore — undo soft-delete */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiContext(async ({ userId }) => {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      throw new Error("Bad request: Invalid project id");
    }
    const _id = new mongoose.Types.ObjectId(params.id);

    const project = await Project.findOneAndUpdate(
      { _id, userId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true }
    ).lean();
    if (!project) throw new Error("Not found");
    return { project };
  });
}
