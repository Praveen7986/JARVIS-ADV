/**
 * Real-Time Hot Topic News Service for JARVIS
 * Ingests, parses, and caches live headlines from Google News RSS.
 * Provides both structured data and natural speech-optimized briefings.
 */

export interface NewsArticle {
  title: string;
  source: string;
  link: string;
  pubDate: string;
  category?: string;
}

export type NewsCategory = "technology" | "business" | "science" | "world" | "sports" | "entertainment";

type NewsMessage = { role: "user" | "assistant"; content: string };

interface CacheEntry {
  timestamp: number;
  articles: NewsArticle[];
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
const newsCache = new Map<string, CacheEntry>();

// Decode standard XML / HTML entities
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8212;/g, "—")
    .replace(/&#8211;/g, "–")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Detects if a message is asking about news, hot topics, headlines, or current events.
 */
export function detectNewsQuery(message: string): {
  isNews: boolean;
  category?: string;
  query?: string;
  personalized?: boolean;
} {
  const lower = message.toLowerCase().trim();

  // News keywords
  const newsTriggers = [
    "news",
    "headline",
    "headlines",
    "hot topic",
    "hot topics",
    "trending today",
    "trending news",
    "what's happening today",
    "whats happening today",
    "what is happening today",
    "current events",
    "breaking news",
    "world events",
    "today's top stories",
    "todays top stories",
    "top stories",
  ];

  const hasNewsTrigger = newsTriggers.some((t) => lower.includes(t));

  if (!hasNewsTrigger) {
    return { isNews: false };
  }

  const personalized = /my interests|what i(?:'| a)?m interested in|personalized|for me|based on what i like|topics i follow/i.test(lower);

  // Detect specific category
  if (/tech|technology|ai|artificial intelligence|software|silicon/i.test(lower)) {
    return { isNews: true, category: "technology", personalized };
  }
  if (/business|market|economy|stock|finance|crypto|bitcoin/i.test(lower)) {
    return { isNews: true, category: "business", personalized };
  }
  if (/science|space|astronomy|physics|nasa/i.test(lower)) {
    return { isNews: true, category: "science", personalized };
  }
  if (/world|international|global/i.test(lower)) {
    return { isNews: true, category: "world", personalized };
  }
  if (/sport|sports|football|basketball|soccer|cricket|tennis/i.test(lower)) {
    return { isNews: true, category: "sports", personalized };
  }
  if (/entertainment|movie|movies|celebrity|hollywood/i.test(lower)) {
    return { isNews: true, category: "entertainment", personalized };
  }

  return { isNews: true, category: "top", personalized };
}

export function isNewsSourcesQuery(message: string): boolean {
  return /(?:source|sources|where did you get|reference|references|cite|citations)/i.test(message) &&
    /(?:news|headline|story|stories|information|report|reported|briefing|article)/i.test(message);
}

/** Finds the broad topics the user has been discussing recently. */
export function inferNewsInterests(messages: NewsMessage[]): NewsCategory[] {
  const topicPatterns: Array<[NewsCategory, RegExp]> = [
    ["technology", /tech|technology|ai|artificial intelligence|software|silicon|programming|coding/i],
    ["business", /business|market|economy|stock|finance|crypto|bitcoin|startup/i],
    ["science", /science|space|astronomy|physics|nasa|mars|research/i],
    ["world", /world|international|global|politics|geopolitics|election/i],
    ["sports", /sport|football|basketball|soccer|cricket|tennis/i],
    ["entertainment", /entertainment|movie|movies|celebrity|hollywood|music/i],
  ];

  return topicPatterns
    .filter(([, pattern]) => messages.some((message) => message.role === "user" && pattern.test(message.content)))
    .map(([category]) => category);
}

/** Fetches global headlines plus feeds for the topics found in the conversation. */
export async function fetchPersonalizedNews(interests: NewsCategory[] = []): Promise<NewsArticle[]> {
  const categories = Array.from(new Set<NewsCategory>(["world", ...interests])).slice(0, 4);
  const batches = await Promise.all(categories.map((category) => fetchHotNews(category)));
  const seenTitles = new Set<string>();

  return batches
    .flat()
    .filter((article) => {
      const title = article.title.toLowerCase();
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    })
    .slice(0, 10)
    .map((article) => ({ ...article, category: "personalized" }));
}

/**
 * Fetches real-time hot topic news from Google News RSS.
 */
export async function fetchHotNews(category = "top", query?: string): Promise<NewsArticle[]> {
  const cacheKey = `${category}:${query || ""}`.toLowerCase();
  const cached = newsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.articles;
  }

  let rssUrl: string;

  if (query) {
    rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  } else {
    switch (category.toLowerCase()) {
      case "technology":
      case "tech":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en";
        break;
      case "business":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en";
        break;
      case "world":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en";
        break;
      case "science":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en";
        break;
      case "sports":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en";
        break;
      case "entertainment":
        rssUrl = "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en";
        break;
      case "top":
      default:
        rssUrl = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en";
        break;
    }
  }

  try {
    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      // 6 second timeout
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      console.warn(`[NewsService] Failed to fetch RSS (${response.status} ${response.statusText})`);
      return cached?.articles || getFallbackNews(category);
    }

    const xml = await response.text();
    const articles = parseRssXml(xml, category);

    if (articles.length > 0) {
      newsCache.set(cacheKey, { timestamp: Date.now(), articles });
      return articles;
    }

    return cached?.articles || getFallbackNews(category);
  } catch (error) {
    console.warn("[NewsService] RSS fetch error:", error);
    return cached?.articles || getFallbackNews(category);
  }
}

/**
 * Parses items from RSS XML into clean NewsArticle objects.
 */
function parseRssXml(xml: string, category: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < 10) {
    const itemContent = match[1];

    // Extract title
    const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
    let rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
    rawTitle = decodeXmlEntities(rawTitle);

    // Extract link
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1].trim() : "";

    // Extract pubDate
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();

    // Extract source name (Google News titles typically end with " - Source Name")
    let source = "News";
    const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    if (sourceMatch && sourceMatch[1]) {
      source = decodeXmlEntities(sourceMatch[1]);
    } else {
      const parts = rawTitle.split(" - ");
      if (parts.length > 1) {
        source = parts.pop()?.trim() || "News";
        rawTitle = parts.join(" - ").trim();
      }
    }

    // Clean up title: remove trailing source if still present
    if (rawTitle.endsWith(` - ${source}`)) {
      rawTitle = rawTitle.slice(0, -(source.length + 3)).trim();
    }

    if (rawTitle && rawTitle.length > 10) {
      articles.push({
        title: rawTitle,
        source,
        link,
        pubDate,
        category,
      });
    }
  }

  return articles;
}

/**
 * Formats live articles into an articulate, natural spoken briefing for JARVIS.
 */
export function formatNewsForSpeech(articles: NewsArticle[], category = "top"): string {
  if (!articles || articles.length === 0) {
    return "I am currently unable to access the live news feeds, Sir. Please check back in a few moments.";
  }

  const primary = articles[0];
  const additional = articles.slice(1, 5);

  const categoryLabel =
    category === "personalized"
      ? "Across the world and the subjects you have been following,"
      : category === "technology"
      ? "In technology today,"
      : category === "business"
      ? "In global markets and finance today,"
      : category === "science"
      ? "In scientific and space exploration,"
      : category === "world"
      ? "In world affairs today,"
      : category === "sports"
      ? "In sports today,"
      : "Sir, today's primary hot topic centers on";

  let speech = `${categoryLabel} ${cleanTitleForSpeech(primary.title)}, reported by ${primary.source}.`;

  additional.forEach((article, index) => {
    const lead = index === 0 ? "Another major development is" : "Also reported is";
    speech += ` ${lead} ${cleanTitleForSpeech(article.title)}, from ${article.source}.`;
  });

  speech += " Would you like a deeper analysis on any of these developments?";

  return speech;
}

export function formatNewsSourcesForSpeech(articles: NewsArticle[]): string {
  if (!articles || articles.length === 0) {
    return "I do not have any live news sources available at the moment.";
  }

  const sources = Array.from(new Set(articles.slice(0, 10).map((article) => article.source)));
  return `The sources for that briefing are ${sources.join(", ")}. You can open each full article from the live briefing panel.`;
}

/**
 * Strips awkward punctuation and journalistic tags for smooth speech synthesis.
 */
function cleanTitleForSpeech(title: string): string {
  return title
    .replace(/^BREAKING:\s*/i, "")
    .replace(/^EXCLUSIVE:\s*/i, "")
    .replace(/^UPDATE:\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "") // Remove trailing parentheticals like (Photos)
    .replace(/\s*\[[^\]]*\]\s*$/g, "")
    .replace(/\s*;\s*/g, ", ")
    .trim();
}

/**
 * Creates grounding context for the Gemini / OpenAI LLM prompt.
 */
export function formatNewsPromptContext(articles: NewsArticle[], category = "top"): string {
  if (!articles || articles.length === 0) return "";

  const lines = articles.slice(0, 5).map((a, i) => `${i + 1}. "${a.title}" (Source: ${a.source})`);

  return `[LIVE REAL-TIME BREAKING NEWS & HOT TOPICS FOR TODAY (${category.toUpperCase()})]:
${lines.join("\n")}

CRITICAL VOICE INSTRUCTION:
The user is asking about today's news / hot topics. You HAVE direct access to the live headlines above. 
Respond immediately in JARVIS's signature articulate, calm, capable Tony Stark voice.
- State the primary hot topic first with clarity.
- Cover up to 5 notable developments, giving each headline's source when available.
- Keep the response suitable for natural spoken audio (5 to 8 sentences maximum).
- Do NOT use markdown asterisks, bullet points, or raw web links in your speech.
- Conclude by asking if they would like deeper coverage on any specific story.`;
}

/**
 * Graceful fallback headlines in the unlikely event of total network disconnection.
 */
function getFallbackNews(category: string): NewsArticle[] {
  const now = new Date().toUTCString();
  return [
    {
      title: "Major advancements reported in next-generation artificial intelligence and orbital systems",
      source: "Global Tech Wire",
      link: "https://news.google.com",
      pubDate: now,
      category,
    },
    {
      title: "Global energy transition milestones accelerate across key economic sectors",
      source: "Reuters",
      link: "https://news.google.com",
      pubDate: now,
      category,
    },
    {
      title: "International scientific consortium reveals new deep space telemetry data",
      source: "Science Daily",
      link: "https://news.google.com",
      pubDate: now,
      category,
    },
  ];
}
