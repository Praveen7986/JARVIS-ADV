export interface MemoryItem {
  id: string;
  category: "PERMANENT_FACT" | "USER_PREFERENCE" | "TEMPORARY_CONTEXT" | "AGENT_DECISION";
  key: string;
  value: unknown;
  confidence: number;
  createdAt: string;
  expiresAt?: string;
}

class Man1MemoryStore {
  private memories: Map<string, MemoryItem> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.setMemory("pref_auto_reply_faq", "USER_PREFERENCE", true, 1.0);
    this.setMemory("pref_quiet_hours", "USER_PREFERENCE", { start: "23:00", end: "07:00" }, 1.0);
    this.setMemory("fact_owner_role", "PERMANENT_FACT", "JARVIS System Owner & Lead Engineer", 1.0);
  }

  public setMemory(
    key: string,
    category: MemoryItem["category"],
    value: unknown,
    confidence = 1.0,
    ttlSeconds?: number
  ) {
    const id = `mem_${key}`;
    const now = new Date();
    const expiresAt = ttlSeconds ? new Date(now.getTime() + ttlSeconds * 1000).toISOString() : undefined;

    this.memories.set(id, {
      id,
      category,
      key,
      value,
      confidence,
      createdAt: now.toISOString(),
      expiresAt,
    });
  }

  public getMemory<T = unknown>(key: string): T | undefined {
    const id = `mem_${key}`;
    const item = this.memories.get(id);
    if (!item) return undefined;
    if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
      this.memories.delete(id);
      return undefined;
    }
    return item.value as T;
  }

  public listMemories(): MemoryItem[] {
    const now = new Date();
    const active: MemoryItem[] = [];
    for (const [id, item] of Array.from(this.memories.entries())) {
      if (item.expiresAt && new Date(item.expiresAt) < now) {
        this.memories.delete(id);
      } else {
        active.push(item);
      }
    }
    return active;
  }
}

export const personalMemory = new Man1MemoryStore();
