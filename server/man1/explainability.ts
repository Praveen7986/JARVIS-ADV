import { auditLogger } from "./auditLog";

export function explainAction(actionOrEventId: string): string {
  const byId = auditLogger.getById(actionOrEventId);
  if (byId) {
    return `[${byId.agent}] ${byId.actionType}: ${byId.explanation} (Confidence: ${(byId.confidence * 100).toFixed(0)}%, Policy: ${byId.policyApplied})`;
  }

  const logs = auditLogger.getByEventId(actionOrEventId);
  if (logs.length > 0) {
    return logs
      .map(
        (l) =>
          `• [${l.timestamp.slice(11, 19)}] ${l.actionType} by ${l.agent}: ${l.explanation} [Status: ${l.status}]`
      )
      .join("\n");
  }

  return `No specific audit record found for identifier ${actionOrEventId}.`;
}
