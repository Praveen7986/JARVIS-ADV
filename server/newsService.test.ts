import { describe, expect, it } from "vitest";
import { detectNewsQuery, formatNewsSourcesForSpeech, inferNewsInterests, isNewsSourcesQuery } from "./newsService";

describe("personalized news", () => {
  it("recognizes a personalized worldwide breaking-news request", () => {
    expect(detectNewsQuery("Give me recent worldwide breaking news about my interests.")).toEqual({
      isNews: true,
      category: "world",
      personalized: true,
    });
  });

  it("infers distinct topics from recent user messages", () => {
    expect(
      inferNewsInterests([
        { role: "user", content: "I have been following AI startups and space research." },
        { role: "assistant", content: "Noted." },
        { role: "user", content: "Give me a personalized news briefing." },
      ])
    ).toEqual(["technology", "business", "science"]);
  });

  it("recognizes source requests and names the live sources", () => {
    expect(isNewsSourcesQuery("What are the sources for that news briefing?")).toBe(true);
    expect(
      formatNewsSourcesForSpeech([
        { title: "A long enough headline", source: "Reuters", link: "", pubDate: "" },
        { title: "Another long enough headline", source: "BBC", link: "", pubDate: "" },
        { title: "A duplicate source headline", source: "Reuters", link: "", pubDate: "" },
      ])
    ).toContain("Reuters, BBC");
  });
});
