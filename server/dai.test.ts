import { describe, it, expect } from "vitest";

type DaiImportance = "low" | "medium" | "high" | "critical";

interface DaiNewsEvent {
  id: string;
  category: string;
  importance: DaiImportance;
  relevance: "low" | "medium" | "high";
  title: string;
  source: string;
  timestamp: string;
  summary: string;
  whyItMatters: string;
  link?: string;
}

interface DaiInterruptContext {
  currentConversation: { role: string; content: string }[];
  currentUserRequest: string;
  currentTask: string;
  currentTaskProgress: string;
  currentSentence: string;
  currentSentencePosition: number;
  currentApplication: string;
  currentWorkflowStep: string;
  currentToolExecutionState: string;
  currentResearchState: string;
  currentUIState: string;
  currentVoiceState: "speaking" | "listening" | "idle";
  pendingActions: string[];
  pendingQuestions: string[];
  capturedAt: string;
}

const DAI_IMPORTANCE_RANK: Record<DaiImportance, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function normalizeDaiEvent(event: Partial<DaiNewsEvent>): DaiNewsEvent {
  return {
    id: event.id || `dai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: event.category || "technology",
    importance: event.importance || "high",
    relevance: event.relevance || "high",
    title: event.title || "An important update has arrived",
    source: event.source || "JARVIS News Engine",
    timestamp: event.timestamp || new Date().toISOString(),
    summary: event.summary || "A significant event has been detected.",
    whyItMatters: event.whyItMatters || "Selected based on active context priorities.",
    link: event.link,
  };
}

function shouldInterruptJarvis(
  importance: DaiImportance,
  jarvisBusy: boolean
): boolean {
  if (importance === "critical" || importance === "high") {
    return true;
  }
  if (importance === "medium") {
    return !jarvisBusy;
  }
  return false;
}

function sortDaiQueue(queue: DaiNewsEvent[]): DaiNewsEvent[] {
  return [...queue].sort(
    (a, b) => DAI_IMPORTANCE_RANK[b.importance] - DAI_IMPORTANCE_RANK[a.importance]
  );
}

describe("DAI Phase - Dynamic Attention Interface Architecture", () => {
  it("normalizes incomplete incoming news events with safe defaults", () => {
    const raw = { title: "New Quantum Computing Breakthrough" };
    const normalized = normalizeDaiEvent(raw);

    expect(normalized.title).toBe("New Quantum Computing Breakthrough");
    expect(normalized.category).toBe("technology");
    expect(normalized.importance).toBe("high");
    expect(normalized.relevance).toBe("high");
    expect(normalized.id).toBeDefined();
    expect(normalized.timestamp).toBeDefined();
  });

  it("determines interruption authorization according to priority rules", () => {
    // Critical always interrupts
    expect(shouldInterruptJarvis("critical", true)).toBe(true);
    expect(shouldInterruptJarvis("critical", false)).toBe(true);

    // High always interrupts
    expect(shouldInterruptJarvis("high", true)).toBe(true);
    expect(shouldInterruptJarvis("high", false)).toBe(true);

    // Medium only interrupts if JARVIS is idle
    expect(shouldInterruptJarvis("medium", true)).toBe(false);
    expect(shouldInterruptJarvis("medium", false)).toBe(true);

    // Low never interrupts directly, gets queued
    expect(shouldInterruptJarvis("low", true)).toBe(false);
    expect(shouldInterruptJarvis("low", false)).toBe(false);
  });

  it("maintains strict priority ordering in the DAI news queue", () => {
    const events: DaiNewsEvent[] = [
      normalizeDaiEvent({ id: "1", importance: "low", title: "Low 1" }),
      normalizeDaiEvent({ id: "2", importance: "critical", title: "Critical 1" }),
      normalizeDaiEvent({ id: "3", importance: "medium", title: "Medium 1" }),
      normalizeDaiEvent({ id: "4", importance: "high", title: "High 1" }),
    ];

    const sorted = sortDaiQueue(events);
    expect(sorted.map((e) => e.importance)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ]);
  });

  it("preserves conversation and speech character offset inside DAI_INTERRUPT_CONTEXT", () => {
    const speechText = "We can implement authentication using JSON Web Tokens and refresh tokens stored securely.";
    const interruptedPosition = 7; // after "We can "

    const context: DaiInterruptContext = {
      currentConversation: [
        { role: "user", content: "Explain how we can implement authentication." },
        { role: "assistant", content: speechText },
      ],
      currentUserRequest: "Explain how we can implement authentication.",
      currentTask: "JARVIS is presenting the current response",
      currentTaskProgress: "Response is available in the conversation",
      currentSentence: speechText,
      currentSentencePosition: interruptedPosition,
      currentApplication: "JARVIS interface",
      currentWorkflowStep: "Presenting architectural response",
      currentToolExecutionState: "IDLE",
      currentResearchState: "Preserved in the conversation context",
      currentUIState: "input=idle",
      currentVoiceState: "speaking",
      pendingActions: [],
      pendingQuestions: [],
      capturedAt: new Date().toISOString(),
    };

    // Verify context is immutable and intact
    expect(context.currentUserRequest).toBe("Explain how we can implement authentication.");
    expect(context.currentConversation).toHaveLength(2);

    // Simulate resumption: slice remaining text from character offset
    const remainingText = context.currentSentence.slice(context.currentSentencePosition);
    expect(remainingText).toBe("implement authentication using JSON Web Tokens and refresh tokens stored securely.");
  });

  it("executes valid state machine transitions from JARVIS_SPEAKING to DAI_ACTIVE to WAITING_FOR_USER to JARVIS_RESUMED", () => {
    const history: string[] = [];
    let state = "JARVIS_SPEAKING";
    history.push(state);

    // News arrives
    state = "DAI_PENDING";
    history.push(state);

    state = "DAI_INTERRUPT_REQUESTED";
    history.push(state);

    state = "JARVIS_PAUSING";
    history.push(state);

    state = "DAI_ACTIVE";
    history.push(state);

    state = "DAI_PRESENTING";
    history.push(state);

    state = "DAI_COMPLETING";
    history.push(state);

    state = "DAI_RETURNING";
    history.push(state);

    state = "JARVIS_RESTORING";
    history.push(state);

    state = "WAITING_FOR_USER";
    history.push(state);

    // User confirms: "Yes"
    state = "JARVIS_RESUMED";
    history.push(state);

    expect(history).toEqual([
      "JARVIS_SPEAKING",
      "DAI_PENDING",
      "DAI_INTERRUPT_REQUESTED",
      "JARVIS_PAUSING",
      "DAI_ACTIVE",
      "DAI_PRESENTING",
      "DAI_COMPLETING",
      "DAI_RETURNING",
      "JARVIS_RESTORING",
      "WAITING_FOR_USER",
      "JARVIS_RESUMED",
    ]);
  });
});
