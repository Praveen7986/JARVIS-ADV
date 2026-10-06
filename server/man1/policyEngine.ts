export interface Man1Permissions {
  EMAIL_READ: boolean;
  EMAIL_DRAFT: boolean;
  EMAIL_SEND: boolean;
  INSTAGRAM_READ: boolean;
  INSTAGRAM_REPLY: boolean;
  COMMUNITY_READ: boolean;
  COMMUNITY_REPLY: boolean;
  GITHUB_READ: boolean;
  GITHUB_WRITE: boolean;
  TASK_MANAGE: boolean;
}

export type Man1SystemState = "ACTIVE" | "PAUSED" | "STOPPED";

class PolicyEngineStore {
  private permissions: Man1Permissions = {
    EMAIL_READ: true,
    EMAIL_DRAFT: true,
    EMAIL_SEND: true,
    INSTAGRAM_READ: true,
    INSTAGRAM_REPLY: true,
    COMMUNITY_READ: true,
    COMMUNITY_REPLY: true,
    GITHUB_READ: true,
    GITHUB_WRITE: true,
    TASK_MANAGE: true,
  };

  private systemState: Man1SystemState = "ACTIVE";
  private confidenceThreshold = 0.75;
  private autoReplyFaqEnabled = true;

  public getSystemState(): Man1SystemState {
    return this.systemState;
  }

  public setSystemState(state: Man1SystemState) {
    this.systemState = state;
  }

  public getPermissions(): Man1Permissions {
    return { ...this.permissions };
  }

  public updatePermission(key: keyof Man1Permissions, value: boolean) {
    this.permissions[key] = value;
  }

  public isAutoReplyFaqEnabled(): boolean {
    return this.autoReplyFaqEnabled;
  }

  public setAutoReplyFaqEnabled(enabled: boolean) {
    this.autoReplyFaqEnabled = enabled;
  }

  public checkActionPolicy(action: {
    service: keyof Man1Permissions;
    actionType: "AUTO_REPLY" | "SEND" | "DRAFT" | "NOTIFY" | "MUTATE";
    confidence: number;
    isSensitive?: boolean;
    isFinancial?: boolean;
    isLegal?: boolean;
    isUnknownSender?: boolean;
  }): {
    allowed: boolean;
    requiresApproval: boolean;
    reason: string;
  } {
    // 1. System-wide Emergency Stop / Pause
    if (this.systemState === "STOPPED") {
      return { allowed: false, requiresApproval: false, reason: "MAN1 is STOPPED. All autonomous external actions are blocked." };
    }
    if (this.systemState === "PAUSED") {
      return { allowed: false, requiresApproval: true, reason: "MAN1 is PAUSED. Action held in queue for review." };
    }

    // 2. Granular Permission Check
    if (this.permissions[action.service] === false) {
      return { allowed: false, requiresApproval: false, reason: `Permission ${action.service} is disabled by user policy.` };
    }

    // 3. High Risk / Sensitive Policy Check
    if (action.isFinancial || action.isLegal || action.isSensitive) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `Action involves sensitive topics (${action.isFinancial ? "financial" : action.isLegal ? "legal" : "sensitive"}). Escalated to approval queue.`,
      };
    }

    // 4. Confidence Threshold Check
    if (action.confidence < this.confidenceThreshold) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: `AI confidence (${(action.confidence * 100).toFixed(0)}%) is below required threshold (${(this.confidenceThreshold * 100).toFixed(0)}%). Escalated for human verification.`,
      };
    }

    // 5. Auto Reply Setting Check
    if (action.actionType === "AUTO_REPLY" && !this.autoReplyFaqEnabled) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: "Automatic FAQ replies are currently disabled in policy settings.",
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      reason: "Action complies with configured autonomy policy and confidence threshold.",
    };
  }
}

export const policyEngine = new PolicyEngineStore();
