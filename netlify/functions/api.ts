import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { parse as parseCookieHeader, serialize as serializeCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { appRouter } from "../../server/routers";
import { sdk } from "../../server/_core/sdk";

const trpcLambdaHandler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: async ({ event }) => {
    let user = null;
    const responseCookies: string[] = [];

    try {
      const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
      const cookies = parseCookieHeader(cookieHeader);
      const sessionToken = cookies[COOKIE_NAME];
      if (sessionToken) {
        user = await sdk.verifySession(sessionToken);
      }
    } catch {
      user = null;
    }

    return {
      req: {
        headers: event.headers,
        protocol: "https",
        ip: event.headers?.["x-forwarded-for"] || event.headers?.["client-ip"] || "127.0.0.1",
      } as any,
      res: {
        cookie: (name: string, val: string, options: any) => {
          responseCookies.push(serializeCookie(name, val, options));
        },
        clearCookie: (name: string, options: any) => {
          responseCookies.push(serializeCookie(name, "", { ...options, maxAge: -1 }));
        },
        _responseCookies: responseCookies,
      } as any,
      user,
    };
  },
  responseMeta: ({ ctx }) => {
    const cookies = (ctx?.res as any)?._responseCookies as string[] | undefined;
    if (cookies && cookies.length > 0) {
      return {
        headers: {
          "Set-Cookie": cookies[0],
        },
      };
    }
    return {};
  },
});

interface NetlifyFunctionEvent {
  rawUrl?: string;
  path: string;
  httpMethod: string;
  headers: Record<string, string | undefined>;
  multiValueHeaders?: Record<string, string[] | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

export async function handler(event: NetlifyFunctionEvent, context: any) {
  let normalizedPath = event.path || "/";

  // Normalize path by stripping Netlify function prefix and /api/trpc prefix
  // e.g. /.netlify/functions/api/trpc/jarvis.chat -> /jarvis.chat
  // e.g. /api/trpc/jarvis.chat -> /jarvis.chat
  normalizedPath = normalizedPath
    .replace(/^\/\.netlify\/functions\/api\/trpc/, "")
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api\/trpc/, "")
    .replace(/^\/api/, "");

  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  // Pass normalized event to tRPC Lambda request handler
  const lambdaEvent: any = {
    ...event,
    path: normalizedPath,
    rawPath: normalizedPath,
    requestContext: {
      http: {
        method: event.httpMethod,
        path: normalizedPath,
      },
    },
  };

  const response = await trpcLambdaHandler(lambdaEvent, context);

  return {
    ...response,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      ...response.headers,
    },
  };
}
