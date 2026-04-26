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

/**
 * Inline images embedded by the rich-text editor live inside the `body` HTML
 * directly (as <img> tags pointing to Cloudinary URLs). The legacy `images`
 * field is kept for backwards compatibility but is unused by the WYSIWYG flow.
 */
const ImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    caption: { type: String, default: "" },
    width: Number,
    height: Number,
    addedAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

/**
 * Non-image attachments — PDFs, docs, audio, video, anything. Rendered as
 * a card row below the note body.
 */
const AttachmentSchema = new Schema(
  {
    publicId: { type: String, required: true }, // Cloudinary public_id
    url: { type: String, required: true }, // signed/secure URL
    name: { type: String, required: true }, // original filename
    contentType: { type: String, default: "" }, // MIME
    size: { type: Number, default: 0 }, // bytes
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
    /**
     * Rich-text body — HTML emitted by TipTap. May contain inline <img> tags
     * served from Cloudinary. Empty string is valid (= no body yet).
     */
    body: { type: String, default: "" },
    tags: { type: [String], default: [] },
    links: { type: [LinkSchema], default: [] },
    images: { type: [ImageSchema], default: [] }, // legacy, see comment above
    attachments: { type: [AttachmentSchema], default: [] },
    driveRefs: { type: [DriveRefSchema], default: [] }, // Phase 3c
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
