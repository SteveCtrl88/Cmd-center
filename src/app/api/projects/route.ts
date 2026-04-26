import { NextRequest } from "next/server";
import { z } from "zod";
import { withApiContext, apiError } from "@/lib/api-helpers";
import { Project, PROJECT_COLOR_OPTIONS } from "@/models/Project";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(""),
  color: z.enum(PROJECT_COLOR_OPTIONS).optional().default("blue"),
  tags: z.array(z.string()).optional().default([]),
});

/**
 * GET /api/projects
 *   ?include=trash → return soft-deleted projects (for restore UI)
 *   default        → active projects only
 */
export async function GET(req: NextRequest) {
  return withApiContext(async ({ userId }) => {
    const include = req.nextUrl.searchParams.get("include");

    const filter =
      include === "trash"
        ? { userId, deletedAt: { $ne: null } }
        : { userId, deletedAt: null };

    const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();

    return { projects };
  });
}

/** POST /api/projects */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateProjectSchema.parse(body);

    return withApiContext(async ({ userId }) => {
      const project = await Project.create({ ...data, userId });
      return { project: project.toObject() };
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(new Error(`Bad request: ${err.errors[0]?.message}`));
    }
    return apiError(err);
  }
}
