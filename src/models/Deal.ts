import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

/**
 * Cached Lightfield Opportunity, stored locally so the Sales dashboard
 * renders without hitting the Lightfield API on every page load.
 *
 * `cachedAt` carries a TTL index — records auto-expire after 48 hours
 * if a sync hasn't refreshed them, matching the PRD spec.
 */
const FollowUpSchema = new Schema(
  {
    task: { type: String, default: "" },
    assignee: { type: String, default: "" },
    dueDate: { type: Date },
  },
  { _id: true }
);

const DealSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    /** Opportunity id from Lightfield. */
    lightfieldId: { type: String, required: true, index: true },

    // Projected display fields (computed in lib/lightfield.ts/projectOpportunity)
    name: { type: String, default: "" },
    accountName: { type: String, default: "" },
    stage: { type: String, default: "" },
    amount: { type: Schema.Types.Mixed, default: null }, // number or string
    nextSteps: { type: String, default: "" },
    owner: { type: String, default: "" },
    description: { type: String, default: "" },
    httpLink: { type: String, default: "" },
    followUps: { type: [FollowUpSchema], default: [] }, // populated when we wire Tasks lookup

    // Raw fields blob — kept verbatim so the UI can pivot if our projection misses something
    rawFields: { type: Schema.Types.Mixed, default: {} },

    // Lightfield timestamps
    lightfieldCreatedAt: { type: Date },
    lightfieldUpdatedAt: { type: Date },

    // AI summary (Phase 4)
    aiSummary: { type: String, default: "" },
    aiSummaryAt: { type: Date },

    // Cache control
    cachedAt: {
      type: Date,
      default: () => new Date(),
      // 48h TTL — Mongo nukes the doc if no sync refreshes it
      expires: 60 * 60 * 48,
      index: true,
    },
  },
  { timestamps: true, collection: "deals" }
);

// Each user/opportunity pair is unique
DealSchema.index({ userId: 1, lightfieldId: 1 }, { unique: true });
// Common query: recently-updated active deals for the user
DealSchema.index({ userId: 1, lightfieldUpdatedAt: -1 });

export type DealDoc = InferSchemaType<typeof DealSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Deal: Model<DealDoc> =
  (mongoose.models.Deal as Model<DealDoc>) ||
  mongoose.model<DealDoc>("Deal", DealSchema);
