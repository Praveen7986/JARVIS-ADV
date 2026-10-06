import { NormalizedEvent } from "../types";
import { worldModel } from "../worldModel";
import { policyEngine } from "../policyEngine";
import { approvalEngine } from "../approvalEngine";
import { auditLogger } from "../auditLog";
import { duplicatePrevention } from "../duplicatePrevention";

class CommunityAgent {
  private stats = {
    questionsReceived: 0,
    answeredAutomatically: 0,
    escalatedToUser: 0,
  };

  private recentQuestions: Array<{
    id: string;
    author: string;
    question: string;
    resolution: string;
    status: string;
    timestamp: string;
  }> = [];

  public async processQuestion(event: NormalizedEvent) {
    if (duplicatePrevention.isEventDuplicate(event.event_id)) {
      return { handled: false, reason: "Duplicate community question ignored" };
    }
    duplicatePrevention.markEventProcessed(event.event_id);

    this.stats.questionsReceived += 1;
    const author = event.actor.handleOrEmail || event.actor.name;
    const question = event.content.text;
    const qLower = question.toLowerCase();

    const isBilling =
      event.event_type === "COMMUNITY_BILLING_REQUEST" ||
      event.authorization_context?.isFinancial ||
      qLower.includes("billing") ||
      qLower.includes("pricing") ||
      qLower.includes("invoice") ||
      qLower.includes("refund") ||
      qLower.includes("cost") ||
      qLower.includes("plan");

    let resolution = "";
    let status = "Answered";

    if (isBilling) {
      this.stats.escalatedToUser += 1;
      status = "Escalated to owner";
      resolution = "Billing & pricing inquiry routed to approval queue.";

      approvalEngine.enqueueApproval({
        eventId: event.event_id,
        source: "COMMUNITY",
        agent: "COMMUNITY_AGENT",
        title: `Community Billing Inquiry from ${author}`,
        reason: "Message involves pricing / billing terms which requires owner approval by policy.",
        proposedAction: `Send customized enterprise pricing response to ${author}.`,
        riskLevel: "HIGH",
        confidence: 0.92,
        payload: { author, question },
      });
    } else {
      const faqMatch = worldModel.matchFaq(question);
      if (faqMatch && faqMatch.faq.autoReplyAllowed) {
        this.stats.answeredAutomatically += 1;
        resolution = `${faqMatch.faq.approvedAnswer}${faqMatch.faq.approvedLink ? ` Guide: ${faqMatch.faq.approvedLink}` : ""}`;
        status = "Answered automatically";

        auditLogger.log({
          eventId: event.event_id,
          agent: "COMMUNITY_AGENT",
          actionType: "COMMUNITY_AUTO_ANSWER",
          confidence: faqMatch.confidence,
          policyApplied: "COMMUNITY_FAQ_AUTO_REPLY_ALLOWED",
          status: "SUCCESS",
          explanation: `Answered technical community question with approved guide: "${faqMatch.faq.topic}"`,
          details: { author, question, resolution },
        });
      } else {
        this.stats.answeredAutomatically += 1;
        resolution =
          "Thanks for asking! For setup and usage details, please refer to the project documentation in the repository.";
        status = "Answered automatically";

        auditLogger.log({
          eventId: event.event_id,
          agent: "COMMUNITY_AGENT",
          actionType: "COMMUNITY_STANDARD_REPLY",
          confidence: 0.85,
          policyApplied: "COMMUNITY_STANDARD_POLICY",
          status: "SUCCESS",
          explanation: "Provided standard documentation reference.",
          details: { author, question, resolution },
        });
      }
    }

    this.recentQuestions.unshift({
      id: `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author,
      question,
      resolution,
      status,
      timestamp: event.timestamp,
    });

    return { author, question, resolution, status };
  }

  public getStats() {
    return {
      ...this.stats,
      billingQuestions: this.stats.escalatedToUser || 1,
      recentQuestions: this.recentQuestions.slice(0, 30),
    };
  }

  public resetStats() {
    this.stats = {
      questionsReceived: 0,
      answeredAutomatically: 0,
      escalatedToUser: 0,
    };
    this.recentQuestions = [];
  }
}

export const communityAgent = new CommunityAgent();
