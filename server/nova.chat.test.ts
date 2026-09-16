import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = {
  user: undefined,
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("jarvis.chat", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the conversation to the server-side OpenAI relay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "I’m online and ready." } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");

    const result = await appRouter.createCaller(context).jarvis.chat({
      messages: [{ role: "user", content: "Are you there?" }],
    });

    expect(result).toEqual({ reply: "I’m online and ready." });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-server-key" }),
      }),
    );
  });
});
