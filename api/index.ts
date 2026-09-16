import { createJarvisApp } from "../server/createApp";

let app: any;
try {
  app = createJarvisApp();
} catch (e: any) {
  console.error("Failed to create app:", e);
}

export default async function handler(req: any, res: any) {
  if (!app) {
    return res.status(500).json({ error: "App initialization failed" });
  }

  // Ensure headers and path are forwarded
  return new Promise((resolve) => {
    app(req, res, (err: any) => {
      if (err) {
        console.error("App execution error:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
      }
      resolve(null);
    });
  });
}
