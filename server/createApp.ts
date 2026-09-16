import "dotenv/config";
import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

export function createJarvisApp(): Express {
  const app = express();
  const authAttempts = new Map<string, { count: number; resetAt: number }>();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), microphone=(self), camera=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Rate limiting for auth routes
  app.use("/api/trpc", (req, res, next) => {
    if (!req.path.includes("auth.login") && !req.path.includes("auth.register")) return next();
    const now = Date.now();
    const key = req.ip || "unknown";
    const current = authAttempts.get(key);
    if (!current || current.resetAt <= now) {
      authAttempts.set(key, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    if (current.count >= 10) {
      res.status(429).json({ error: "Too many authentication attempts. Try again in one minute." });
      return;
    }
    current.count += 1;
    next();
  });

  // Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Static proxy & OAuth
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    ["/api/trpc", "/trpc"],
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
