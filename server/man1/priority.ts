import { Man1Priority, NormalizedEvent } from "./types";
import { worldModel } from "./worldModel";

export interface PriorityEvaluation {
  priority: Man1Priority;
  score: number;
  reasons: string[];
}

export function evaluateEventPriority(event: NormalizedEvent): PriorityEvaluation {
  const reasons: string[] = [];
  let score = 50; // Base score (P3 range)

  const contentStr = `${event.content.title || ""} ${event.content.text}`.toLowerCase();

  // 1. Critical & Security triggers -> P0
  if (
    contentStr.includes("security breach") ||
    contentStr.includes("unauthorized access") ||
    contentStr.includes("production down") ||
    contentStr.includes("server crash") ||
    contentStr.includes("database corruption") ||
    contentStr.includes("emergency")
  ) {
    score += 45;
    reasons.push("Critical system or security keyword detected");
  }

  // 2. Financial & Legal implications
  if (
    event.authorization_context?.isFinancial ||
    event.authorization_context?.isLegal ||
    contentStr.includes("payment") ||
    contentStr.includes("invoice") ||
    contentStr.includes("contract") ||
    contentStr.includes("wire transfer") ||
    contentStr.includes("pricing")
  ) {
    score += 25;
    reasons.push("Financial, contract, or legal implication");
  }

  // 3. Sender relationship
  const contact = worldModel.getContact(event.actor.handleOrEmail || event.actor.id);
  if (contact?.relationship === "vip") {
    score += 30;
    reasons.push(`High priority sender: VIP contact (${contact.name})`);
  } else if (contact?.relationship === "client") {
    score += 20;
    reasons.push(`Important partner/client: ${contact.name}`);
  } else if (contact?.relationship === "team") {
    score += 15;
    reasons.push(`Core team member: ${contact.name}`);
  }

  // 4. Urgency & deadline keywords
  if (
    contentStr.includes("urgent") ||
    contentStr.includes("asap") ||
    contentStr.includes("deadline") ||
    contentStr.includes("immediately") ||
    contentStr.includes("due today")
  ) {
    score += 20;
    reasons.push("Urgent time constraints specified in event");
  }

  // 5. Promotional / Newsletter damping
  if (
    contentStr.includes("newsletter") ||
    contentStr.includes("unsubscribe") ||
    contentStr.includes("promo") ||
    contentStr.includes("sale ends") ||
    contentStr.includes("discount code")
  ) {
    score -= 35;
    reasons.push("Promotional or bulk newsletter pattern");
  }

  // Map score to Priority level
  let priority: Man1Priority = "P3";
  if (score >= 90) priority = "P0";
  else if (score >= 75) priority = "P1";
  else if (score >= 60) priority = "P2";
  else if (score >= 35) priority = "P3";
  else priority = "P4";

  return { priority, score, reasons };
}
