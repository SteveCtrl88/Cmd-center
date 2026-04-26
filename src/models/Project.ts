import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

/**
 * Drive reference sub-schema — populated in Phase 3b. Leaving the field
 * in place now so we don't have to migrate documents later.
 */
const DriveRefSchema = new Schema(
  {
    driveId: { type: String, required: true },
    type: {
      type: String,
      enum: ["doc", "sheet", "slide", "folder", "file", "form", "drawing"],
      required: true,
    },
    title: String,
    mimeType: String,
    url: { type: String, required: true },
    previewUrl: String,
    iconUrl: String,
    parentFolder: String,
    fetchedAt: Date,
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const PROJECT_COLORS = [
  "blue",
  "emerald",
  "purple",
  "amber",
  "rose",
  "indigo",
  "cyan",
  "orange",
] as const;
export type ProjectColor = (typeof PROJECT_COLORS)[number];

const ProjectSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 1000 },
    color: {
      type: String,
      enum: PROJECT_COLORS,
      default: "blue",
    },
    tags: { type: [String], default: [] },
    noteCount: { type: Number, default: 0 }, // denormalized for fast grid render
    driveRefs: { type: [DriveRefSchema], default: [] },

    // Soft delete — entries with deletedAt are hidden from list endpoints
    // but recoverable for 30 days. A nightly cleanup (Phase 3 polish) can
    // hard-delete after the window.
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "projects" }
);

// Compound index for the most common query (user's active projects, by recency)
ProjectSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Project: Model<ProjectDoc> =
  (mongoose.models.Project as Model<ProjectDoc>) ||
  mongoose.model<ProjectDoc>("Project", ProjectSchema);

export const PROJECT_COLOR_OPTIONS = PROJECT_COLORS;
