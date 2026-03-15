import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../database";
import * as schema from "../database/schema";

const defaultAuthBaseURL = "http://localhost:3000";

export const auth = betterAuth({
  baseURL: (process.env.BETTER_AUTH_URL ?? defaultAuthBaseURL).replace(/\/$/, ""),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
