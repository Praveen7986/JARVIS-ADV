export type Man1Priority = "P0" | "P1" | "P2" | "P3" | "P4";

export type UserOperationalState = "USER_AWAKE" | "USER_AWAY" | "USER_SLEEPING" | "QUIET_HOURS";

export type Man1EventSource = "EMAIL" | "INSTAGRAM" | "COMMUNITY" | "GITHUB" | "TASK" | "CALENDAR" | "SYSTEM";

export type Man1EventType =
  | "EMAIL_RECEIVED"
  | "EMAIL_REPLY_REQUIRED"
  | "EMAIL_IMPORTANT"
  | "EMAIL_ATTACHMENT_RECEIVED"
  | "INSTAGRAM_DM_RECEIVED"
  | "INSTAGRAM_COMMENT_RECEIVED"
  | "INSTAGRAM_MENTION_RECEIVED"
  | "INSTAGRAM_LEAD_DETECTED"
  | "MESSAGE_RECEIVED"
  | "MISSED_CALL"
  | "CALL_RECEIVED"
  | "COMMUNITY_QUESTION"
  | "COMMUNITY_SUPPORT_REQUEST"
  | "COMMUNITY_BILLING_REQUEST"
  | "GIT_COMMIT"
  | "PULL_REQUEST"
  | "ISSUE_CREATED"
  | "CI_FAILURE"
  | "CI_SUCCESS"
  | "DEPLOYMENT_COMPLETED"
  | "DEPLOYMENT_FAILED"
  | "TASK_CREATED"
  | "TASK_DUE"
  | "TASK_OVERDUE"
  | "TASK_COMPLETED"
  | "CALENDAR_EVENT_UPCOMING"
  | "USER_AWAY"
  | "USER_RETURNED"
  | "USER_SLEEPING"
  | "USER_AWAKE"
  | "SCHEDULE_TRIGGERED";

export interface NormalizedEvent {
  event_id: string;
  source: Man1EventSource;
  event_type: Man1EventType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    handleOrEmail?: string;
    roleOrRelationship?: string;
  };
  content: {
    title?: string;
    text: string;
    rawPayload?: Record<string, unknown>;
  };
  metadata: Record<string, unknown>;
  priority_hint?: Man1Priority;
  authorization_context?: {
    requiredPermission?: string;
    isSensitive?: boolean;
    isFinancial?: boolean;
    isLegal?: boolean;
  };
  status: "QUEUED" | "PROCESSING" | "PROCESSED" | "ESCALATED" | "FAILED" | "DROPPED";
}

export type LeadStatus =
  | "NEW"
  | "INTERESTED"
  | "RESPONDED"
  | "LINK_SENT"
  | "CONVERTED"
  | "FOLLOW_UP_REQUIRED"
  | "ESCALATED"
  | "CLOSED";

export interface InstagramLead {
  id: string;
  userId: string;
  username: string;
  topic: string;
  status: LeadStatus;
  conversationId: string;
  firstContactAt: string;
  lastContactAt: string;
  linkSent?: string;
  notes?: string;
}

export interface ApprovedFaq {
  id: string;
  topic: string;
  patterns: string[];
  approvedAnswer: string;
  approvedLink?: string;
  category: "email" | "instagram" | "community" | "general";
  autoReplyAllowed: boolean;
}

export interface WorldModelContact {
  id: string;
  name: string;
  handleOrEmail: string;
  relationship: "vip" | "client" | "team" | "community" | "lead" | "unknown";
  notes?: string;
  lastInteractedAt?: string;
}

export interface WorldModelConversation {
  id: string;
  channel: Man1EventSource;
  participantId: string;
  participantName: string;
  topic: string;
  status: "ACTIVE" | "PENDING_REPLY" | "AWAITING_APPROVAL" | "RESOLVED";
  messages: Array<{
    sender: "user" | "jarvis" | "participant";
    text: string;
    timestamp: string;
    automated?: boolean;
  }>;
  lastActionSummary?: string;
}

export interface ApprovalItem {
  id: string;
  eventId: string;
  source: Man1EventSource;
  agent: string;
  title: string;
  reason: string;
  proposedAction: string;
  riskLevel: "HIGH" | "MEDIUM" | "CRITICAL";
  confidence: number;
  payload: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED";
  createdAt: string;
  decidedAt?: string;
  decisionNote?: string;
}

export interface AuditLogEntry {
  id: string;
  eventId: string;
  timestamp: string;
  agent: string;
  actionType: string;
  confidence: number;
  policyApplied: string;
  status: "SUCCESS" | "ESCALATED" | "BLOCKED" | "FAILED" | "DRAFTED";
  explanation: string;
  details: Record<string, unknown>;
}

export interface Man1AgentStats {
  email: {
    received: number;
    noAction: number;
    informational: number;
    routineReplies: number;
    important: number;
    requiresApproval: number;
    sentimentScore: {
      positive: number;
      neutral: number;
      negative: number;
      isAnyoneMad: boolean;
      sentimentSummary: string;
    };
    labeledCategories: {
      work: number;
      billing: number;
      urgent: number;
      newsletters: number;
      routine: number;
    };
    draftsWaitingApproval: number;
    recentActions: Array<{
      id: string;
      from: string;
      subject: string;
      action: string;
      response?: string;
      timestamp: string;
      status: string;
      sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    }>;
  };
  instagram: {
    dmsReceived: number;
    faqMatches: number;
    responsesSent: number;
    leadsIdentified: number;
    escalated: number;
    commonQuestionDetected: string;
    linkSentCount: number;
    convertedCount: number;
    conversionRatePercent: number;
    recentDms: Array<{
      id: string;
      user: string;
      message: string;
      reply?: string;
      timestamp: string;
      status: string;
      converted?: boolean;
    }>;
  };
  community: {
    questionsReceived: number;
    answeredAutomatically: number;
    escalatedToUser: number;
    billingQuestions: number;
    recentQuestions: Array<{
      id: string;
      author: string;
      question: string;
      resolution: string;
      status: string;
      timestamp: string;
      category?: string;
    }>;
  };
  dev: {
    commitsTracked: number;
    prsMonitored: number;
    ciPassed: number;
    ciFailed: number;
    deployments: number;
    lastFix?: {
      author: string;
      pushedTime: string;
      testedCount: number;
      status: "WORKS" | "PASSED" | "FAILED";
      repo: string;
    };
    recentEvents: Array<{
      id: string;
      author: string;
      repo: string;
      branch: string;
      commitMessage: string;
      ciStatus: "PASSED" | "FAILED" | "RUNNING";
      deploymentStatus: string;
      timestamp: string;
    }>;
  };
  tasks: {
    active: number;
    completed: number;
    approachingDeadline: number;
    followUpsScheduled: number;
    sleepSchedule: {
      bedtime: string;
      wakeTime: string;
      sleepDurationFormatted: string;
      nextWakeCall: string;
    };
    recentTasks: Array<{
      id: string;
      title: string;
      dueDate?: string;
      status: "PENDING" | "FOLLOW_UP" | "COMPLETED";
      origin: string;
      timestamp: string;
    }>;
  };
}

export interface IntegrationCredentials {
  gmail: {
    enabled: boolean;
    authType: "app_password" | "oauth2" | "simulated";
    emailAddress?: string;
    appPassword?: string;
    clientId?: string;
    status: "CONNECTED" | "UNCONFIGURED" | "ERROR" | "SIMULATED";
    lastSync?: string;
  };
  instagram: {
    enabled: boolean;
    accessToken?: string;
    pageId?: string;
    status: "CONNECTED" | "UNCONFIGURED" | "ERROR" | "SIMULATED";
    lastSync?: string;
  };
  github: {
    enabled: boolean;
    personalAccessToken?: string;
    repoOwner?: string;
    repoName?: string;
    status: "CONNECTED" | "UNCONFIGURED" | "ERROR" | "SIMULATED";
    lastSync?: string;
  };
  community: {
    enabled: boolean;
    platform: "discord" | "slack" | "telegram" | "simulated";
    botToken?: string;
    channelId?: string;
    status: "CONNECTED" | "UNCONFIGURED" | "ERROR" | "SIMULATED";
    lastSync?: string;
  };
  mode: "REAL_INGESTION" | "HYBRID" | "SIMULATED";
}

export interface BriefingReport {
  id: string;
  generatedAt: string;
  userStateDuringPeriod: UserOperationalState;
  periodDurationHours: number;
  voiceScript: string;
  fastMorningScript: string;
  summaryBullets: string[];
  stats: Man1AgentStats;
  pendingApprovalsCount: number;
  isMorningCallReady: boolean;
}
