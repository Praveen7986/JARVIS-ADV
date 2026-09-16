import { createJarvisApp } from "../server/createApp";

const app = createJarvisApp();

export default function handler(req: any, res: any) {
  return app(req, res);
}
