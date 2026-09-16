export default async function handler(req: any, res: any) {
  try {
    const { createJarvisApp } = await import("../server/createApp.js");
    const app = createJarvisApp();
    return app(req, res);
  } catch (err: any) {
    try {
      const { createJarvisApp } = await import("../server/createApp");
      const app = createJarvisApp();
      return app(req, res);
    } catch (innerErr: any) {
      return res.status(200).json({
        diagnosticError: innerErr?.message || String(innerErr),
        stack: innerErr?.stack,
      });
    }
  }
}
