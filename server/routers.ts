import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateJarvisResponse } from "./jarvisBrain";
import { fetchKnowledgeContext, formatKnowledgePromptContext, isKnowledgeSourcesQuery } from "./knowledgeService";
import { fetchTopicImages } from "./imageService";
import { openApp, type AppName } from "./appActions";
import {
  detectNewsQuery,
  fetchHotNews,
  fetchPersonalizedNews,
  formatNewsForSpeech,
  formatNewsSourcesForSpeech,
  formatNewsPromptContext,
  inferNewsInterests,
  isNewsSourcesQuery,
  type NewsArticle,
} from "./newsService";
import { createTracePerson, createTraceSharingLink, deleteTracePerson, listTracePeople, resolveTraceSharingToken, revokeTraceSharingLink } from "./traceSharingService";
import { loginLocalUser, registerLocalUser } from "./localAuth";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const jarvisSystemPrompt = `You are JARVIS, a highly capable general-purpose AI assistant. Answer the user's actual question directly and use the conversation for context. For a short topic or term such as "robotics", first define what it is in one or two clear sentences, then ask: "Would you like a brief explanation, a deeper explanation, or an example?" Do not ask the user to restate their goal before giving that definition. For normal questions, answer first and do not add an unnecessary follow-up question. Be accurate, clear, and useful; explain unfamiliar ideas with a concise example when helpful. You can discuss science, history, technology, coding, culture, health information, finance concepts, planning, and everyday questions. For medical, legal, or financial decisions, provide general information and clearly recommend a qualified professional when appropriate. Distinguish verified facts from uncertainty, never invent sources or pretend to have taken real-world actions, and say when information may be out of date. Keep spoken replies natural, usually 2-6 short sentences, but give more detail when the user asks for it. If live reference context is supplied, use it and mention the source naturally only when relevant or requested.`;

const appCommand = /^(?:please\s+)?open\s+(calculator|notepad|terminal|browser)(?:\s+app)?[.!]?$/i;
const PROVIDER_TIMEOUT_MS = 10_000;
const VISION_PROVIDER_TIMEOUT_MS = 15_000;

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure
      .input(z.object({ name: z.string().trim().min(1).max(160), email: z.string().email().max(320), password: z.string().min(8).max(128) }))
      .mutation(({ input, ctx }) => registerLocalUser(input, ctx)),
    login: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(128) }))
      .mutation(({ input, ctx }) => loginLocalUser(input, ctx)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  jarvis: router({
    getHotNews: publicProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
            query: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const articles = await fetchHotNews(input?.category || "top", input?.query);
        return { articles };
      }),

    chat: publicProcedure
      .input(
        z.object({
          messages: z.array(chatMessageSchema).min(1).max(20),
          customApiKey: z.string().optional(),
          screenImage: z.string().max(8_000_000).optional(),
          screenAutoAnalyze: z.boolean().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = input.customApiKey || process.env.OPENAI_API_KEY;

        const latestMessage = input.messages[input.messages.length - 1]?.content || "";
        const screenAnalysisRequested = Boolean(input.screenImage);
        const appMatch = latestMessage.trim().match(appCommand);
        const knowledgeSourcesRequested = isKnowledgeSourcesQuery(latestMessage);
        if (appMatch) {
          const app = appMatch[1].toLowerCase() as AppName;
          try {
            openApp(app);
            return { reply: `Opening ${app}.`, action: { type: "open_app" as const, app }, newsArticles: [], sourceLinks: [], topicImages: [] };
          } catch (error) {
            console.warn("[JARVIS] App launch failed:", error);
            return { reply: `I could not open ${app} on this computer.`, newsArticles: [], sourceLinks: [], topicImages: [] };
          }
        }
        const newsCheck = detectNewsQuery(latestMessage);
        const sourcesRequested = isNewsSourcesQuery(latestMessage);
        const topicImagesPromise = screenAnalysisRequested ? Promise.resolve([]) : fetchTopicImages(latestMessage);
        const isTopicOnlyMessage = /^[a-z\d][a-z\d\s-]{1,79}$/i.test(latestMessage.trim()) && latestMessage.trim().split(/\s+/).length <= 8;

        let liveNewsArticles: NewsArticle[] | undefined;
        let newsSpeechFallback: string | undefined;
        let effectiveSystemPrompt = jarvisSystemPrompt;

        const knowledgeQuery = latestMessage.replace(/^(?:show|give|get|find|provide)\s+(?:me\s+)?(?:the\s+)?(?:source|sources|references?|citations?|links?)\s*(?:for|of)?\s*:?\s*/i, "");
        const definitionQuery = /^robo$/i.test(knowledgeQuery.trim()) ? "robotics" : knowledgeQuery;
        const knowledgeContext = !screenAnalysisRequested && (knowledgeSourcesRequested || isTopicOnlyMessage)
          ? await fetchKnowledgeContext(definitionQuery)
          : null;
        const sourceLinks = knowledgeContext && knowledgeSourcesRequested
          ? [
              {
                title: knowledgeContext.title,
                url: knowledgeContext.url,
                source: "Wikipedia",
              },
            ]
          : undefined;
        if (knowledgeContext) {
          effectiveSystemPrompt = `${effectiveSystemPrompt}\n\n${formatKnowledgePromptContext(knowledgeContext)}\n\n${knowledgeSourcesRequested ? "The user explicitly asked for sources. Name the source and include its URL in the answer." : "Do not mention the source or retrieval process unless the user asks for sources."}`;
        }

        if (screenAnalysisRequested) {
          effectiveSystemPrompt = `${effectiveSystemPrompt}\n\nSCREEN ANALYSIS MODE: The final user message includes a live screenshot captured from the user's shared screen. Inspect the attached image carefully before answering. ${input.screenAutoAnalyze ? 'Begin the response with exactly: "I found a screen access and it contains".' : "Describe exactly what is visible, including the application, page, dialog, error, text, buttons, and relevant layout."} Answer the user's question about the screen directly. Never claim to see something that is not readable in the image; say when a detail is unclear. Do not answer from the text alone when the question asks what is on screen.`;
        }

        // Gemini's native endpoint is used for screen images because its OpenAI-compatible
        // endpoint accepts text reliably but does not consistently process image_url parts.
        if (screenAnalysisRequested && geminiKey) {
          const imageMatch = input.screenImage?.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
          if (imageMatch) {
            const configuredGeminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
            const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/${configuredGeminiModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;
            for (let attempt = 1; attempt <= 2; attempt += 1) {
              try {
                const response = await fetch(visionUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [
                        { text: `${effectiveSystemPrompt}\n\nUser question: ${latestMessage}` },
                        { inline_data: { mime_type: imageMatch[1], data: imageMatch[2] } },
                      ],
                    }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
                  }),
                  signal: AbortSignal.timeout(VISION_PROVIDER_TIMEOUT_MS),
                });
                const data = (await response.json()) as {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                  error?: { message?: string };
                };
                const visionReply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim();
                if (response.ok && visionReply) {
                  const topicImages = await fetchTopicImages(visionReply);
                  return { reply: visionReply, ...(topicImages.length > 0 ? { topicImages } : {}) };
                }
                console.warn(`Gemini vision attempt ${attempt} failed:`, response.status, data.error?.message || "No vision response");
                if (response.status === 401 || response.status === 403) {
                  console.warn("Gemini vision credentials were rejected; trying OpenAI vision.");
                  break;
                }
                if (response.status === 429) {
                  console.warn("Gemini vision quota exhausted; trying OpenAI vision.");
                  break;
                }
              } catch (error) {
                console.warn(`Gemini vision attempt ${attempt} failed:`, error);
              }
            }
          }

          if (openaiKey) {
            try {
              const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                  model: "gpt-4o-mini",
                  temperature: 0.3,
                  max_tokens: 450,
                  messages: [
                    { role: "system", content: effectiveSystemPrompt },
                    {
                      role: "user",
                      content: [
                        { type: "text", text: latestMessage },
                        { type: "image_url", image_url: { url: input.screenImage } },
                      ],
                    },
                  ],
                }),
                signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
              });
              const data = (await response.json()) as {
                choices?: Array<{ message?: { content?: string | null } }>;
                error?: { message?: string };
              };
              const openaiVisionReply = data.choices?.[0]?.message?.content?.trim();
              if (response.ok && openaiVisionReply) {
                const topicImages = await fetchTopicImages(openaiVisionReply);
                return { reply: openaiVisionReply, ...(topicImages.length > 0 ? { topicImages } : {}) };
              }
              console.warn("OpenAI vision error:", response.status, data.error?.message || "No vision response");
            } catch (error) {
              console.warn("OpenAI vision call failed:", error);
            }
          }

          return { reply: "I found a screen access, but the vision service did not return an analysis. Please try sharing the screen again." };
        }

        const providerMessages = input.messages.slice(-20).map((message, index, messages) => {
          if (!input.screenImage || index !== messages.length - 1 || message.role !== "user") return message;
          return {
            role: "user" as const,
            content: [
              { type: "text", text: message.content },
              { type: "image_url", image_url: { url: input.screenImage } },
            ],
          };
        });

        if (newsCheck.isNews || sourcesRequested) {
          try {
            liveNewsArticles = newsCheck.personalized
              ? await fetchPersonalizedNews(inferNewsInterests(input.messages))
              : await fetchHotNews(newsCheck.category, newsCheck.query);
            if (liveNewsArticles && liveNewsArticles.length > 0) {
              const newsCategory = newsCheck.personalized ? "personalized" : newsCheck.category;
              newsSpeechFallback = sourcesRequested
                ? formatNewsSourcesForSpeech(liveNewsArticles)
                : formatNewsForSpeech(liveNewsArticles, newsCategory);
              const newsGrounding = formatNewsPromptContext(liveNewsArticles, newsCategory);
              effectiveSystemPrompt = `${jarvisSystemPrompt}\n\n${newsGrounding}\n\n${sourcesRequested ? "The user asked for sources. List the source names clearly and explain that the article links are available in the briefing panel." : "Give a fuller briefing rather than stopping after one headline."}`;
            }
          } catch (e) {
            console.warn("[JARVIS] Could not retrieve news context:", e);
          }
        }

        // 1. Try Gemini API first if configured
        if (geminiKey) {
          try {
            const configuredGeminiModel = process.env.GEMINI_MODEL?.trim();
            const geminiModel = configuredGeminiModel || "gemini-3.6-flash";
            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${geminiKey}`,
              },
              body: JSON.stringify({
                model: geminiModel,
                temperature: 0.7,
                max_tokens: 700,
                messages: [
                  { role: "system", content: effectiveSystemPrompt },
                  ...providerMessages,
                ],
              }),
              signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
            });

            const data = (await response.json()) as {
              choices?: Array<{ message?: { content?: string | null } }>;
              error?: { message?: string };
              [key: string]: unknown;
            };

            if (response.ok) {
              const rawReply = data.choices?.[0]?.message?.content?.trim();
              if (rawReply) {
                const reply = rawReply.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
                const topicImages = await topicImagesPromise;
                return {
                  reply,
                  ...(topicImages.length > 0 ? { topicImages } : {}),
                  ...(liveNewsArticles ? { newsArticles: liveNewsArticles } : {}),
                  ...(sourceLinks ? { sourceLinks } : {}),
                };
              }
            } else {
              console.warn("Gemini API error:", response.status, data.error?.message || JSON.stringify(data).slice(0, 500));
            }
          } catch (err) {
            console.warn("Gemini call failed, checking alternatives:", err);
          }
        }

        // 2. Try OpenAI API if configured
        if (openaiKey) {
          try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 700,
                messages: [
                  { role: "system", content: effectiveSystemPrompt },
                  ...providerMessages,
                ],
              }),
              signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
            });

            const data = (await response.json()) as {
              choices?: Array<{ message?: { content?: string | null } }>;
              error?: { message?: string };
              [key: string]: unknown;
            };

            if (response.ok) {
              const rawReply = data.choices?.[0]?.message?.content?.trim();
              if (rawReply) {
                const reply = rawReply.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
                const topicImages = await topicImagesPromise;
                return {
                  reply,
                  ...(topicImages.length > 0 ? { topicImages } : {}),
                  ...(liveNewsArticles ? { newsArticles: liveNewsArticles } : {}),
                  ...(sourceLinks ? { sourceLinks } : {}),
                };
              }
            } else {
              console.warn("OpenAI API returned an error:", data.error?.message || JSON.stringify(data).slice(0, 500));
            }
          } catch (err) {
            console.warn("OpenAI call failed:", err);
          }
        }

        // 3. Built-in intelligent conversational engine for JARVIS
        const reply = generateJarvisResponse(
          input.messages,
          newsSpeechFallback,
          knowledgeContext?.extract,
          knowledgeSourcesRequested ? knowledgeContext?.url : undefined,
        );
        if (screenAnalysisRequested) {
          return {
            reply: "I found a screen access, but I could not inspect its contents because the vision model did not respond. Please keep screen sharing enabled and try again.",
          };
        }
        const topicImages = await topicImagesPromise;
        return {
          reply,
          ...(topicImages.length > 0 ? { topicImages } : {}),
          ...(liveNewsArticles ? { newsArticles: liveNewsArticles } : {}),
          ...(sourceLinks ? { sourceLinks } : {}),
        };
      }),
  }),

  trace: router({
    people: protectedProcedure.query(({ ctx }) => listTracePeople(ctx.user.id)),

    addPerson: protectedProcedure
      .input(z.object({
        name: z.string().trim().min(1).max(160),
        displayName: z.string().trim().max(160).optional(),
        category: z.enum(["family", "friends", "relatives", "others"]),
        photoUrl: z.string().url().optional(),
      }))
      .mutation(({ input, ctx }) => createTracePerson({ ...input, ownerUserId: ctx.user.id })),

    removePerson: protectedProcedure
      .input(z.object({ personId: z.number().int().positive() }))
      .mutation(({ input, ctx }) => deleteTracePerson(input.personId, ctx.user.id)),

    createSharingLink: protectedProcedure
      .input(z.object({ personId: z.number().int().positive(), baseUrl: z.string().url() }))
      .mutation(async ({ input, ctx }) => createTraceSharingLink(input.personId, ctx.user.id, input.baseUrl)),

    revokeSharingLink: protectedProcedure
      .input(z.object({ linkId: z.number().int().positive(), personId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await revokeTraceSharingLink(input.linkId, input.personId, ctx.user.id);
        return { success: true } as const;
      }),

    resolveSharingLink: publicProcedure
      .input(z.object({ token: z.string().min(40).max(100) }))
      .query(async ({ input }) => {
        const person = await resolveTraceSharingToken(input.token);
        return person
          ? { person: { id: person.id, name: person.name, displayName: person.displayName, category: person.category, photoUrl: person.photoUrl } }
          : null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
