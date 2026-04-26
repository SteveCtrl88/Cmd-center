import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL?.toLowerCase().trim();

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.readonly",
].join(" ");

/**
 * Refreshes a Google OAuth access token using the stored refresh token.
 * Returns the updated token payload, or marks an error so the client can re-auth.
 */
async function refreshGoogleAccessToken(token: {
  refreshToken?: string;
  accessToken?: string;
  accessTokenExpires?: number;
  id?: string;
}) {
  try {
    if (!token.refreshToken) throw new Error("No refresh token available");

    const url = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    // Persist the new access token and expiry to Mongo so server-side jobs
    // can use the latest token without waiting for the user to hit the app.
    if (token.id) {
      await connectToDatabase();
      await User.updateOne(
        { _id: token.id },
        {
          accessToken: refreshed.access_token,
          accessTokenExpiresAt: new Date(
            Date.now() + (refreshed.expires_in ?? 3600) * 1000
          ),
          ...(refreshed.refresh_token
            ? { refreshToken: refreshed.refresh_token }
            : {}),
        }
      );
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires:
        Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (err) {
    console.error("Failed to refresh Google access token", err);
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    /**
     * Single-email gate. Reject any Google account other than the one
     * configured in ALLOWED_EMAIL.
     */
    async signIn({ user }) {
      if (!ALLOWED_EMAIL) return true; // open in dev if not configured
      const email = user.email?.toLowerCase().trim();
      return email === ALLOWED_EMAIL;
    },

    async jwt({ token, account, user }) {
      // Initial sign-in — persist tokens to Mongo and put them on the JWT.
      if (account && user) {
        await connectToDatabase();
        const doc = await User.findOneAndUpdate(
          { email: user.email },
          {
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            accessTokenExpiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return {
          ...token,
          id: doc._id.toString(),
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
        };
      }

      // Token still valid — return as-is.
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 60_000
      ) {
        return token;
      }

      // Expired or about to expire — refresh.
      return refreshGoogleAccessToken(token);
    },

    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
};
