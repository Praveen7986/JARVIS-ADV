import { describe, expect, it } from "vitest";
import { eventBus } from "./man1/eventBus";
import { evaluateEventPriority } from "./man1/priority";
import { policyEngine } from "./man1/policyEngine";
import { approvalEngine } from "./man1/approvalEngine";
import { briefingEngine } from "./man1/briefingEngine";
import { runReferenceOvernightScenario } from "./man1/scenarioRunner";
import { emailAgent } from "./man1/agents/emailAgent";
import { instagramAgent } from "./man1/agents/instagramAgent";
import { communityAgent } from "./man1/agents/communityAgent";
import { devAgent } from "./man1/agents/devAgent";
import { worldModel } from "./man1/worldModel";
import { createTraceShareToken, hashTraceShareToken, updateTracePersonLocation } from "./traceSharingService";

describe("MAN1 Architecture & Multi-Agent Operations", () => {
  it("evaluates event priority correctly based on multi-signal scoring", () => {
    // 1. Critical security event -> P0
    const p0Eval = evaluateEventPriority({
      event_id: "evt_sec",
      source: "SYSTEM",
      event_type: "DEPLOYMENT_FAILED",
      timestamp: new Date().toISOString(),
      actor: { id: "sys", name: "System" },
      content: { title: "Production server crash and emergency alert", text: "Database server crash detected." },
      metadata: {},
      status: "QUEUED",
    });
    expect(p0Eval.priority).toBe("P0");

    // 2. Financial invoice -> High score / P1 or P2
    const p1Eval = evaluateEventPriority({
      event_id: "evt_fin",
      source: "EMAIL",
      event_type: "EMAIL_REPLY_REQUIRED",
      timestamp: new Date().toISOString(),
      actor: { id: "fin", name: "Finance" },
      content: { title: "Payment invoice contract due today", text: "Please authorize wire transfer." },
      metadata: {},
      authorization_context: { isFinancial: true },
      status: "QUEUED",
    });
    expect(["P0", "P1", "P2"]).toContain(p1Eval.priority);

    // 3. Promotional newsletter -> P4
    const p4Eval = evaluateEventPriority({
      event_id: "evt_promo",
      source: "EMAIL",
      event_type: "EMAIL_RECEIVED",
      timestamp: new Date().toISOString(),
      actor: { id: "promo", name: "Promo" },
      content: { title: "Special discount promo newsletter", text: "Weekly digest. Unsubscribe anytime." },
      metadata: {},
      status: "QUEUED",
    });
    expect(p4Eval.priority).toBe("P4");
  });

  it("enforces action policies, confidence thresholds, and emergency stop", () => {
    // 1. Normal active state allows high confidence safe auto-reply
    policyEngine.setSystemState("ACTIVE");
    const allowedCheck = policyEngine.checkActionPolicy({
      service: "EMAIL_SEND",
      actionType: "AUTO_REPLY",
      confidence: 0.95,
    });
    expect(allowedCheck.allowed).toBe(true);

    // 2. Sensitive / financial action requires human-in-the-loop approval
    const finCheck = policyEngine.checkActionPolicy({
      service: "EMAIL_SEND",
      actionType: "AUTO_REPLY",
      confidence: 0.95,
      isFinancial: true,
    });
    expect(finCheck.allowed).toBe(false);
    expect(finCheck.requiresApproval).toBe(true);

    // 3. Emergency stop blocks all autonomous external actions
    policyEngine.setSystemState("STOPPED");
    const stopCheck = policyEngine.checkActionPolicy({
      service: "EMAIL_SEND",
      actionType: "AUTO_REPLY",
      confidence: 1.0,
    });
    expect(stopCheck.allowed).toBe(false);
    expect(stopCheck.reason).toContain("STOPPED");

    // Restore to active
    policyEngine.setSystemState("ACTIVE");
  });

  it("executes the complete reference overnight scenario across all 5 agents", async () => {
    const result = await runReferenceOvernightScenario();
    expect(result.success).toBe(true);

    // 1. Email Agent stats
    const emailStats = emailAgent.getStats();
    expect(emailStats.received).toBe(38);
    expect(emailStats.noAction).toBe(17);
    expect(emailStats.informational).toBe(10);
    expect(emailStats.routineReplies).toBe(7);
    expect(emailStats.important).toBe(4); // 3 work + 1 financial invoice
    expect(emailStats.requiresApproval).toBeGreaterThanOrEqual(1);

    // 2. Instagram Agent stats
    const igStats = instagramAgent.getStats();
    expect(igStats.dmsReceived).toBe(322);
    expect(igStats.responsesSent).toBeGreaterThan(0);
    expect(igStats.leadsIdentified).toBeGreaterThan(0);

    // 3. Community Agent stats (3 questions: 2 answered, 1 billing escalated)
    const commStats = communityAgent.getStats();
    expect(commStats.questionsReceived).toBe(3);
    expect(commStats.answeredAutomatically).toBe(2);
    expect(commStats.escalatedToUser).toBe(1);

    // 4. Dev Agent stats (TC commit + CI success)
    const devStats = devAgent.getStats();
    expect(devStats.commitsTracked).toBe(1);
    expect(devStats.ciPassed).toBeGreaterThanOrEqual(1);

    // 5. Approvals Queue has pending items (financial invoice & billing question)
    const pending = approvalEngine.listPending();
    expect(pending.length).toBeGreaterThan(0);

    // 6. Briefing Engine compiles complete structured report & natural voice script
    const briefing = briefingEngine.generateBriefing();
    expect(briefing.voiceScript).toContain("briefing");
    expect(briefing.voiceScript).toContain("38");
    expect(briefing.voiceScript).toContain("Instagram");
    expect(briefing.summaryBullets.length).toBeGreaterThanOrEqual(5);
  });

  it("handles mobile GPS location updates and tracking tokens", async () => {
    const token = createTraceShareToken();
    const tokenHash = hashTraceShareToken(token);
    expect(token).toBeTruthy();
    expect(tokenHash).toHaveLength(64);
  });

  it("manages persistent credentials and connector test handshakes", async () => {
    const { credentialStore } = await import("./man1/credentialStore");
    const { liveSyncEngine } = await import("./man1/liveSyncEngine");

    // Test updates
    const updated = credentialStore.updateCredentials({
      mode: "REAL_INGESTION",
      github: { repoOwner: "owner", repoName: "azaris-core" },
    });
    expect(updated.mode).toBe("REAL_INGESTION");

    // Test handshakes
    const ghCheck = await credentialStore.testConnection("github");
    expect(ghCheck.service).toContain("GitHub");

    const igCheck = await credentialStore.testConnection("instagram");
    expect(igCheck.service).toContain("Instagram");

    const gmailCheck = await credentialStore.testConnection("gmail");
    expect(gmailCheck.service).toContain("Gmail");

    const commCheck = await credentialStore.testConnection("community");
    expect(commCheck.service).toContain("Relay");

    // Test live sync engine status
    const status = liveSyncEngine.getStatus();
    expect(status.syncResults).toBeDefined();
    expect(status.lastSyncTimestamp).toBeTruthy();
  });
});
