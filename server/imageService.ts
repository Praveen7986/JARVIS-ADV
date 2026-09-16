export interface TopicImage {
  title: string;
  thumbnailUrl: string;
  url: string;
  source: string;
}

const IMAGE_TIMEOUT_MS = 3000;

function imageSearchTerms(message: string): string {
  return message
    .replace(/\b(please|can you|could you|would you|tell me|explain|show me|what is|what are|who is|where is|when was|why is|how does)\b/gi, " ")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function fetchTopicImages(message: string): Promise<TopicImage[]> {
  const rawSearch = imageSearchTerms(message);
  const search = /^robo$/i.test(rawSearch) ? "robotics" : rawSearch;
  if (search.length < 4 || /^(hi|hello|hey|thanks|okay|ok|source|sources|are you there|how are you|what can you do)$/i.test(search)) return [];

  try {
    const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
    endpoint.search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: search,
      gsrnamespace: "6",
      gsrlimit: "10",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "640",
      format: "json",
      origin: "*",
    }).toString();

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "JARVIS/1.0" },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }> }> };
    };
    const terms = search.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
    const seen = new Set<string>();

    return Object.values(data.query?.pages || {})
      .map((page) => {
        const info = page.imageinfo?.[0];
        const title = (page.title || "Image").replace(/^File:/, "");
        if (!info?.thumburl || !info.url || !info.mime?.startsWith("image/") || seen.has(info.thumburl)) return null;
        const titleText = title.toLowerCase();
        const relevance = terms.reduce((score, term) => score + (titleText.includes(term) ? 2 : 0), 0);
        if (relevance === 0) return null;
        seen.add(info.thumburl);
        return { title, thumbnailUrl: info.thumburl, url: info.url, source: "Wikimedia Commons", relevance };
      })
      .filter((image): image is TopicImage & { relevance: number } => image !== null)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3)
      .map(({ relevance: _relevance, ...image }) => image);
  } catch {
    return [];
  }
}