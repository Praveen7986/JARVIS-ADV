import { NormalizedEvent } from "./types";
import { evaluateEventPriority } from "./priority";
import { emailAgent } from "./agents/emailAgent";
import { instagramAgent } from "./agents/instagramAgent";
import { communityAgent } from "./agents/communityAgent";
import { devAgent } from "./agents/devAgent";
import { taskAgent } from "./agents/taskAgent";
import { auditLogger } from "./auditLog";

class AgentOrchestrator {
  public async handleEvent(event: NormalizedEvent) {
    const priorityEval = evaluateEventPriority(event);
    event.priority_hint = priorityEval.priority;

    auditLogger.log({
      eventId: event.event_id,
      agent: "AGENT_ORCHESTRATOR",
      actionType: "INGEST_AND_ROUTE_EVENT",
      confidence: 1.0,
      policyApplied: "ORCHESTRATION_ROUTING",
      status: "SUCCESS",
      explanation: `Event from ${event.source} prioritized as ${priorityEval.priority} (Score: ${priorityEval.score}). Reasons: ${priorityEval.reasons.join(", ") || "Standard activity"}.`,
      details: { event, priorityEval },
    });

    switch (event.source) {
      case "EMAIL":
        return await emailAgent.processEmail(event);
      case "INSTAGRAM":
        return await instagramAgent.processDm(event);
      case "COMMUNITY":
        return await communityAgent.processQuestion(event);
      case "GITHUB":
        return await devAgent.processDevEvent(event);
      case "TASK":
      case "CALENDAR":
        return await taskAgent.processTaskEvent(event);
      default:
        return { handled: true, status: "Acknowledged by orchestrator" };
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator();
