import { ActionApproval, StructuredLog } from "./types";

class ApprovalManager {
  private approvals: Map<string, ActionApproval> = new Map();
  private logs: StructuredLog[] = [];
  private emergencyStopped = false;
  private autoApproveSafe = true;

  constructor() {
    this.seedDefaultLogs();
  }

  private seedDefaultLogs() {
    this.log({
      level: "INFO",
      source: "AI_PLANNER",
      message: "JARVIS AI Builder Engine initialized and ready.",
      details: { version: "2.4.0-builder", policy: "SECURE_SANDBOX" },
    });
  }

  public isEmergencyStopped(): boolean {
    return this.emergencyStopped;
  }

  public triggerEmergencyStop(reason = "User triggered emergency stop"): void {
    this.emergencyStopped = true;
    this.log({
      level: "WARN",
      source: "APPROVAL_GATE",
      message: `EMERGENCY STOP ACTIVATED: ${reason}. All active training loops and terminal executions halted.`,
    });
  }

  public resetEmergencyStop(): void {
    this.emergencyStopped = false;
    this.log({
      level: "INFO",
      source: "APPROVAL_GATE",
      message: "Emergency stop cleared. Operations resumed to normal state.",
    });
  }

  public requestApproval(params: {
    projectId?: string;
    actionName: string;
    description: string;
    reason: string;
    potentialImpact: string;
    commandOrPath?: string;
    severity: ActionApproval["severity"];
  }): ActionApproval {
    // If safe action and auto-approve enabled, mark approved immediately
    const isAutoApproved = params.severity === "SAFE" && this.autoApproveSafe;

    const approval: ActionApproval = {
      id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      projectId: params.projectId,
      actionName: params.actionName,
      description: params.description,
      reason: params.reason,
      potentialImpact: params.potentialImpact,
      commandOrPath: params.commandOrPath,
      severity: params.severity,
      status: isAutoApproved ? "APPROVED" : "PENDING",
      requestedAt: new Date().toISOString(),
      decidedAt: isAutoApproved ? new Date().toISOString() : undefined,
      note: isAutoApproved ? "Auto-approved by policy engine (safe development action)" : undefined,
    };

    this.approvals.set(approval.id, approval);

    this.log({
      level: isAutoApproved ? "INFO" : "APPROVAL",
      source: "APPROVAL_GATE",
      message: isAutoApproved
        ? `Auto-approved safe action: ${params.actionName}`
        : `Approval required for ${params.severity} action: ${params.actionName}`,
      projectId: params.projectId,
      details: { approvalId: approval.id, impact: params.potentialImpact },
    });

    return approval;
  }

  public decide(id: string, decision: "APPROVED" | "DENIED", note?: string): ActionApproval {
    const item = this.approvals.get(id);
    if (!item) {
      throw new Error(`Approval item ${id} not found`);
    }

    item.status = decision;
    item.decidedAt = new Date().toISOString();
    item.note = note || (decision === "APPROVED" ? "Approved by user" : "Denied by user");
    this.approvals.set(id, item);

    this.log({
      level: decision === "APPROVED" ? "INFO" : "WARN",
      source: "APPROVAL_GATE",
      message: `User ${decision.toLowerCase()} action: ${item.actionName} (Note: ${item.note})`,
      projectId: item.projectId,
    });

    return item;
  }

  public listPending(): ActionApproval[] {
    return Array.from(this.approvals.values()).filter((a) => a.status === "PENDING");
  }

  public listAll(): ActionApproval[] {
    return Array.from(this.approvals.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  public log(entry: Omit<StructuredLog, "id" | "timestamp">): void {
    const fullEntry: StructuredLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(fullEntry);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
  }

  public getLogs(limit = 100, projectId?: string): StructuredLog[] {
    if (projectId) {
      return this.logs.filter((l) => l.projectId === projectId).slice(0, limit);
    }
    return this.logs.slice(0, limit);
  }

  public setAutoApproveSafe(val: boolean) {
    this.autoApproveSafe = val;
  }

  public isAutoApproveSafe(): boolean {
    return this.autoApproveSafe;
  }
}

export const approvalManager = new ApprovalManager();
