export interface KnowledgeContext {
  title: string;
  extract: string;
  url: string;
}

const KNOWLEDGE_TIMEOUT_MS = 4500;

function shouldSearch(message: string): boolean {
  return message.trim().length >= 3 && !/^(hi|hello|hey|thanks|thank you|okay|ok|are you there|how are you|what can you do|what should i|what can i|how should i|help me|can you help|should i)\b/i.test(message.trim());
}

function getSearchTerms(message: string): string {
  return message
    .replace(/\b(show|give|get|find|provide)\s+(me\s+)?(the\s+)?(source|sources|references?|citations?|links?)\s*(for|of)?\b/gi, " ")
    .replace(/\b(please|can you|could you|would you|tell me|explain|what is|what are|who is|where is|when was|why is|how does)\b/gi, " ")
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/** Retrieves a concise, public factual reference when a model needs grounding. */
export async function fetchKnowledgeContext(message: string): Promise<KnowledgeContext | null> {
  if (!shouldSearch(message)) return null;

  const terms = getSearchTerms(message);
  if (!terms) return null;

  try {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: terms,
      srlimit: "1",
      format: "json",
      origin: "*",
    }).toString();

    const searchResponse = await fetch(searchUrl, {
      headers: { Accept: "application/json", "User-Agent": "JARVIS/1.0" },
      signal: AbortSignal.timeout(KNOWLEDGE_TIMEOUT_MS),
    });
    if (!searchResponse.ok) return null;

    const searchData = (await searchResponse.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryResponse = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      {
        headers: { Accept: "application/json", "User-Agent": "JARVIS/1.0" },
        signal: AbortSignal.timeout(KNOWLEDGE_TIMEOUT_MS),
      },
    );
    if (!summaryResponse.ok) return null;

    const summary = (await summaryResponse.json()) as {
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    if (!summary.extract) return null;

    return {
      title: summary.title || title,
      extract: summary.extract.slice(0, 1800),
      url: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    };
  } catch {
    return null;
  }
}

export function formatKnowledgePromptContext(context: KnowledgeContext): string {
  return `REFERENCE KNOWLEDGE (Wikipedia, retrieved live; verify details when precision matters):\nTitle: ${context.title}\nSummary: ${context.extract}\nSource: ${context.url}`;
}

export function isKnowledgeSourcesQuery(message: string): boolean {
  return /(?:source|sources|reference|references|cite|citations|where did you get|link|links)/i.test(message);
}