import { eventBus } from "./eventBus";
import { timeAwareness } from "./timeAwareness";
import { emailAgent } from "./agents/emailAgent";
import { instagramAgent } from "./agents/instagramAgent";
import { communityAgent } from "./agents/communityAgent";
import { devAgent } from "./agents/devAgent";
import { taskAgent } from "./agents/taskAgent";
import { duplicatePrevention } from "./duplicatePrevention";

export async function runReferenceOvernightScenario() {
  // 1. Reset state & set user state to SLEEPING
  duplicatePrevention.clear();
  emailAgent.resetStats();
  instagramAgent.resetStats();
  communityAgent.resetStats();
  devAgent.resetStats();
  taskAgent.resetStats();
  timeAwareness.setUserState("USER_SLEEPING");

  // 2. Ingest 38 Emails
  // - 17 no action (newsletters / promo)
  for (let i = 1; i <= 17; i++) {
    await eventBus.emit({
      source: "EMAIL",
      eventType: "EMAIL_RECEIVED",
      actor: { id: `sender_promo_${i}`, name: `Newsletter #${i}`, handleOrEmail: `news${i}@updates.io` },
      content: { title: `Weekly Digest Volume ${i}`, text: `Here is your weekly promotional newsletter and updates. Unsubscribe anytime.` },
    });
  }

  // - 10 informational
  for (let i = 1; i <= 10; i++) {
    await eventBus.emit({
      source: "EMAIL",
      eventType: "EMAIL_RECEIVED",
      actor: { id: `sender_info_${i}`, name: `Platform Status ${i}`, handleOrEmail: `alerts${i}@cloud.infra` },
      content: { title: `Routine Maintenance Complete - Node ${i}`, text: `Scheduled database backup and index optimization finished with 0 errors.` },
    });
  }

  // - 7 routine FAQ replies
  const routineQuestions = [
    "How can I build an AI agent with JARVIS?",
    "Where can I find the agent blueprint code repository?",
    "How do I create autonomous AI agents in this stack?",
    "Can you share the link on how to build an agent?",
    "How do I get started with AI agents?",
    "Where is the open source blueprint for JARVIS?",
    "How to build an agent step by step?",
  ];
  for (let i = 0; i < routineQuestions.length; i++) {
    await eventBus.emit({
      source: "EMAIL",
      eventType: "EMAIL_REPLY_REQUIRED",
      actor: { id: `sender_faq_${i + 1}`, name: `Builder ${i + 1}`, handleOrEmail: `developer${i + 1}@ai.dev` },
      content: { title: `Question regarding Agent Framework`, text: routineQuestions[i] },
    });
  }

  // - 3 important work emails
  await eventBus.emit({
    source: "EMAIL",
    eventType: "EMAIL_IMPORTANT",
    actor: { id: "sender_sarah", name: "Sarah Connor", handleOrEmail: "sarah@operations.corp", roleOrRelationship: "client" },
    content: { title: "Partnership integration meeting tomorrow", text: "Please confirm if we can schedule a call tomorrow afternoon to review the Q3 deployment timeline." },
  });

  await eventBus.emit({
    source: "EMAIL",
    eventType: "EMAIL_IMPORTANT",
    actor: { id: "sender_david", name: "David Miller", handleOrEmail: "david@product.co" },
    content: { title: "Review attached system architecture", text: "Please share your thoughts on the updated modular event bus specifications." },
  });

  await eventBus.emit({
    source: "EMAIL",
    eventType: "EMAIL_IMPORTANT",
    actor: { id: "sender_alex", name: "Alex Mercer", handleOrEmail: "alex@invest.capital", roleOrRelationship: "vip" },
    content: { title: "Quarterly portfolio review sync", text: "Let's review the milestones achieved this quarter when you are available." },
  });

  // - 1 requires approval (Financial wire / invoice)
  await eventBus.emit({
    source: "EMAIL",
    eventType: "EMAIL_REPLY_REQUIRED",
    actor: { id: "sender_finance", name: "Apex Financial Accounting", handleOrEmail: "billing@apexledger.com" },
    content: {
      title: "Invoice #9482 Payment Authorization Required ($12,500)",
      text: "Please approve the contract payment invoice for dedicated GPU cluster nodes due today.",
    },
    authorizationContext: { isFinancial: true, isSensitive: true },
  });

  // 3. Ingest Instagram DMs (322 total count represented, streaming core batches)
  for (let i = 1; i <= 22; i++) {
    await eventBus.emit({
      source: "INSTAGRAM",
      eventType: "INSTAGRAM_DM_RECEIVED",
      actor: { id: `ig_user_${i}`, name: `creator_${i}`, handleOrEmail: `@creator_${i}` },
      content: { text: "Hey! How can I build an AI agent like JARVIS? Do you have the blueprint or github link?" },
    });
  }
  // Set the total DMs count to 322 and 98 conversions to reflect the reference video
  instagramAgent.setSimulatedStats({
    dmsReceived: 322,
    faqMatches: 322,
    responsesSent: 322,
    leadsIdentified: 98,
    escalated: 0,
    commonQuestionDetected: "How to build their own agent",
  });

  // 4. Ingest 3 Community Questions
  // Q1: Routine setup -> answered
  await eventBus.emit({
    source: "COMMUNITY",
    eventType: "COMMUNITY_QUESTION",
    actor: { id: "comm_user_1", name: "Dev_Kiran", handleOrEmail: "@kiran_dev" },
    content: { text: "How to install and setup the local environment for JARVIS?" },
  });

  // Q2: Routine setup -> answered
  await eventBus.emit({
    source: "COMMUNITY",
    eventType: "COMMUNITY_QUESTION",
    actor: { id: "comm_user_2", name: "Marcus_R", handleOrEmail: "@marcus_r" },
    content: { text: "What are the requirements and getting started steps for running locally?" },
  });

  // Q3: Billing / Pricing question -> escalated
  await eventBus.emit({
    source: "COMMUNITY",
    eventType: "COMMUNITY_BILLING_REQUEST",
    actor: { id: "comm_user_3", name: "Elena_V", handleOrEmail: "@elena_ventures" },
    content: { text: "What is the enterprise pricing for custom organization deployment?" },
    authorizationContext: { isFinancial: true },
  });

  // 5. Ingest Dev Fix pushed at 2:14 by TC
  await eventBus.emit({
    source: "GITHUB",
    eventType: "GIT_COMMIT",
    actor: { id: "dev_tc", name: "TC", handleOrEmail: "tc@dev.team", roleOrRelationship: "team" },
    content: { title: "Fix WebSocket reconnect latency & buffer overflow", text: "Optimized memory buffers for event streaming. 2:14 AM" },
    metadata: { repo: "JARVIS-ADV", branch: "main", commitTime: "02:14:00" },
  });

  await eventBus.emit({
    source: "GITHUB",
    eventType: "CI_SUCCESS",
    actor: { id: "ci_runner", name: "GitHub Actions CI" },
    content: { title: "CI Pipeline Passed", text: "All 18 unit and integration test suites succeeded. Staging deployed." },
    metadata: { repo: "JARVIS-ADV", branch: "main" },
  });

  return { success: true, message: "Reference overnight scenario successfully simulated across all agents." };
}
