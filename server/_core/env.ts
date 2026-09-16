import { randomBytes } from "node:crypto";

const developmentSessionSecret = process.env.JWT_SECRET || "jarvis-default-secure-jwt-secret-token-key-2026";

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== "production") {
  console.warn("[Auth] JWT_SECRET is not configured; using a temporary development session secret.");
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: developmentSessionSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
