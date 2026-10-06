import { describe, expect, it } from "vitest";

describe("OpenAI configuration", () => {
  it("can authenticate to the OpenAI models endpoint when key is configured", async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      expect(true).toBe(true);
      return;
    }

    expect(key).not.toMatch(/^VITE_/);

    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    expect(response.ok).toBe(true);
  }, 20_000);
});
