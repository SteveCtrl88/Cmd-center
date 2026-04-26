import mongoose from "mongoose";

/**
 * Cached connection across hot reloads in dev and across serverless invocations
 * in prod. Mongoose maintains an internal pool, so we want a single connection.
 *
 * The MONGODB_URI check is deferred until connectToDatabase() is actually
 * called — this keeps `next build` working in CI/Vercel preview environments
 * that don't have the env var available at build time (e.g. for static
 * pre-rendering).
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global._mongooseCache ?? { conn: null, promise: null };

if (!global._mongooseCache) {
  global._mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
