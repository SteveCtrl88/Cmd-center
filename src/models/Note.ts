import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const LinkSchema = new Schema(
  {
    url: { type: String, required: true },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    siteName: { type: String, default: "" },
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const ImageSchema = new Schema(
  {
    publicId: { type: String, required: true }, // Cloudinary public_id
    url: { type: String, required: true },
    caption: { type: String, default: "" },
    width: Number,
    height: Number,
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

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

const NoteSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, default: "" }, // markdown
    tags: { type: [String], default: [] },
    links: { type: [LinkSchema], default: [] },
    images: { type: [ImageSchema], default: [] }, // Phase 3b
    driveRefs: { type: [DriveRefSchema], default: [] }, // Phase 3b
    aiSummary: { type: String, default: "" },
    aiSummaryAt: Date,
  },
  { timestamps: true, collection: "notes" }
);

NoteSchema.index({ projectId: 1, updatedAt: -1 });

export type NoteDoc = InferSchemaType<typeof NoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Note: Model<NoteDoc> =
  (mongoose.models.Note as Model<NoteDoc>) ||
  mongoose.model<NoteDoc>("Note", NoteSchema);
