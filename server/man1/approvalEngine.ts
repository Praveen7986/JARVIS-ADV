import { ApprovalItem } from "./types";
import { auditLogger } from "./auditLog";
import { gmailConnector } from "./integrations/gmailConnector";
import { instagramConnector } from "./integrations/instagramConnector";
import { communityConnector } from "./integrations/communityConnector";
import { githubConnector } from "./integrations/githubConnector";

class ApprovalEngineStore {
  private items: Map<string, ApprovalItem> = new Map();

  public enqueueApproval(item: Omit<ApprovalItem, "id" | "createdAt" | "status">): ApprovalItem {
    const id = `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullItem: ApprovalItem = {
      ...item,
      id,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.items.set(id, fullItem);

    auditLogger.log({
      eventId: item.eventId,
      agent: item.agent,
      actionType: "ENQUEUE_APPROVAL",
      confidence: item.confidence,
      policyApplied: "HUMAN_IN_THE_LOOP_REQUIRED",
      status: "ESCALATED",
      explanation: item.reason,
      details: { title: item.title, proposedAction: item.proposedAction },
    });

    return fullItem;
  }

  public getApproval(id: string): ApprovalItem | undefined {
    return this.items.get(id);
  }

  public listPending(): ApprovalItem[] {
    return Array.from(this.items.values()).filter((i) => i.status === "PENDING");
  }

  public listAll(): ApprovalItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async decide(id: string, decision: "APPROVED" | "REJECTED", note?: string): Promise<ApprovalItem> {
    const item = this.items.get(id);
    if (!item) throw new Error("Approval item not found");

    item.status = decision;
    item.decidedAt = new Date().toISOString();
    item.decisionNote = note;

    if (decision === "APPROVED") {
      // Execute live action if applicable
      try {
        const payload = item.payload || {};
        if (item.agent === "EMAIL_AGENT" && payload.draftReply) {
          const to = (payload.recipient as string) || (payload.from as string) || "client@example.com";
          const subject = (payload.subject as string) || item.title.replace(/^Draft reply:\s*/i, "");
          await gmailConnector.createDraft(to, subject, payload.draftReply as string);
        } else if (item.agent === "INSTAGRAM_AGENT" && payload.linkToSend) {
          const recipientId = (payload.recipientId as string) || (payload.senderId as string) || "user";
          await instagramConnector.sendMessage(
            recipientId,
            `Hey! Here is the blueprint link you requested: ${payload.linkToSend}`
          );
        } else if (item.agent === "COMMUNITY_AGENT" && payload.draftReply) {
          const channelId = (payload.channelId as string) || "";
          await communityConnector.postReply(channelId, payload.draftReply as string);
        }
      } catch (execErr: any) {
        console.warn(`[ApprovalEngine] Action execution notice for ${item.id}:`, execErr.message);
      }
    }

    auditLogger.log({
      eventId: item.eventId,
      agent: item.agent,
      actionType: decision === "APPROVED" ? "EXECUTE_APPROVED_ACTION" : "REJECT_PROPOSED_ACTION",
      confidence: 1.0,
      policyApplied: `USER_OVERRIDE_${decision}`,
      status: decision === "APPROVED" ? "SUCCESS" : "BLOCKED",
      explanation: `Human user ${decision.toLowerCase()} proposed action. ${note ? `Note: ${note}` : ""}`,
      details: { item },
    });

    return item;
  }

  public getPendingCount(): number {
    return this.listPending().length;
  }
}

export const approvalEngine = new ApprovalEngineStore();
