import mongoose, { Schema, type Model } from "mongoose";

export interface IUser {
  email: string;
  name?: string;
  image?: string;
  googleId?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    image: { type: String },
    googleId: { type: String, index: true },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    accessTokenExpiresAt: { type: Date },
  },
  { timestamps: true, collection: "users" }
);

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
