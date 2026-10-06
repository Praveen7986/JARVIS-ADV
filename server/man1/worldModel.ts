import { ApprovedFaq, InstagramLead, WorldModelContact, WorldModelConversation } from "./types";

class WorldModelStore {
  private contacts: Map<string, WorldModelContact> = new Map();
  private conversations: Map<string, WorldModelConversation> = new Map();
  private faqs: Map<string, ApprovedFaq> = new Map();
  private leads: Map<string, InstagramLead> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    // Initial approved FAQs
    const defaultFaqs: ApprovedFaq[] = [
      {
        id: "faq_agent_build",
        topic: "How to build an AI agent",
        patterns: [
          "how to build an agent",
          "how can i build an ai agent",
          "how do i build an agent",
          "how to create ai agent",
          "building ai agents",
          "how to build a jarvis",
          "how to build autonomous agent",
          "blueprint",
          "agent blueprint",
          "get started with ai agents",
          "how to build an agent step by step",
          "open source blueprint",
          "code repository",
        ],
        approvedAnswer:
          "To build an AI agent, you need an event bus, world model, specialized domain agents, and an action policy engine. Check out our open-source blueprints and setup guide.",
        approvedLink: "https://github.com/Praveen7986/JARVIS-ADV",
        category: "instagram",
        autoReplyAllowed: true,
      },
      {
        id: "faq_community_setup",
        topic: "Setting up local environment",
        patterns: ["how to install", "setup guide", "getting started", "run locally", "requirements"],
        approvedAnswer:
          "Run `pnpm install` and ensure your `.env` contains the required keys. You can run `pnpm dev` to start the local operations server.",
        approvedLink: "https://github.com/Praveen7986/JARVIS-ADV#getting-started",
        category: "community",
        autoReplyAllowed: true,
      },
      {
        id: "faq_pricing_billing",
        topic: "Pricing & custom deployment plans",
        patterns: ["pricing", "cost", "enterprise subscription", "billing question", "refund", "invoice"],
        approvedAnswer: "For enterprise deployments and customized JARVIS architectures, please consult our private onboarding.",
        category: "community",
        autoReplyAllowed: false, // Billing questions require user approval by policy!
      },
    ];

    defaultFaqs.forEach((faq) => this.faqs.set(faq.id, faq));

    // Initial contacts
    const defaultContacts: WorldModelContact[] = [
      { id: "contact_tc", name: "TC", handleOrEmail: "tc@dev.team", relationship: "team", notes: "Lead backend developer" },
      { id: "contact_sarah", name: "Sarah Connor", handleOrEmail: "sarah@operations.corp", relationship: "client", notes: "Key client partner" },
      { id: "contact_alex", name: "Alex Mercer", handleOrEmail: "alex@invest.capital", relationship: "vip", notes: "Investor inquiries" },
    ];
    defaultContacts.forEach((c) => this.contacts.set(c.id, c));
  }

  public getContact(idOrEmail: string): WorldModelContact | undefined {
    for (const contact of Array.from(this.contacts.values())) {
      if (contact.id === idOrEmail || contact.handleOrEmail.toLowerCase() === idOrEmail.toLowerCase()) {
        return contact;
      }
    }
    return undefined;
  }

  public upsertContact(contact: WorldModelContact) {
    this.contacts.set(contact.id, contact);
  }

  public listContacts(): WorldModelContact[] {
    return Array.from(this.contacts.values());
  }

  public getConversation(id: string): WorldModelConversation | undefined {
    return this.conversations.get(id);
  }

  public getOrCreateConversation(id: string, initial: Partial<WorldModelConversation>): WorldModelConversation {
    let conv = this.conversations.get(id);
    if (!conv) {
      conv = {
        id,
        channel: initial.channel || "EMAIL",
        participantId: initial.participantId || "unknown",
        participantName: initial.participantName || "Anonymous",
        topic: initial.topic || "General",
        status: initial.status || "ACTIVE",
        messages: initial.messages || [],
        lastActionSummary: initial.lastActionSummary,
      };
      this.conversations.set(id, conv);
    }
    return conv;
  }

  public appendMessage(convId: string, msg: { sender: "user" | "jarvis" | "participant"; text: string; automated?: boolean }) {
    const conv = this.getConversation(convId);
    if (conv) {
      conv.messages.push({ ...msg, timestamp: new Date().toISOString() });
    }
  }

  public listFaqs(): ApprovedFaq[] {
    return Array.from(this.faqs.values());
  }

  public matchFaq(text: string): { faq: ApprovedFaq; confidence: number } | null {
    const normalized = text.toLowerCase().trim();
    let bestMatch: ApprovedFaq | null = null;
    let bestScore = 0;

    for (const faq of Array.from(this.faqs.values())) {
      for (const pattern of faq.patterns) {
        if (normalized.includes(pattern)) {
          bestMatch = faq;
          bestScore = Math.max(bestScore, 0.96);
        } else {
          const words = pattern.split(" ");
          const matchCount = words.filter((w: string) => normalized.includes(w)).length;
          const ratio = matchCount / words.length;
          if (ratio > 0.6 && ratio > bestScore) {
            bestScore = 0.82;
            bestMatch = faq;
          }
        }
      }
    }

    if (bestMatch && bestScore >= 0.75) {
      return { faq: bestMatch, confidence: bestScore };
    }
    return null;
  }

  public upsertLead(lead: InstagramLead) {
    this.leads.set(lead.id, lead);
  }

  public getLead(id: string): InstagramLead | undefined {
    return this.leads.get(id);
  }

  public listLeads(): InstagramLead[] {
    return Array.from(this.leads.values());
  }
}

export const worldModel = new WorldModelStore();
