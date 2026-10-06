import { gmailConnector } from "./integrations/gmailConnector";
import { instagramConnector } from "./integrations/instagramConnector";
import { githubConnector } from "./integrations/githubConnector";
import { communityConnector } from "./integrations/communityConnector";
import { agentOrchestrator } from "./agentOrchestrator";
import { NormalizedEvent } from "./types";
import { auditLogger } from "./auditLog";

export interface LiveSyncStatus {
  lastSyncTimestamp: string;
  isSyncing: boolean;
  totalSyncedEvents: number;
  syncResults: {
    gmail: { status: string; count: number; error?: string };
    instagram: { status: string; count: number; error?: string };
    github: { status: string; count: number; error?: string };
    community: { status: string; count: number; error?: string };
  };
}

class LiveSyncEngine {
  private isSyncing = false;
  private lastSyncTimestamp = new Date().toISOString();
  private totalSyncedEvents = 0;
  private syncTimer: NodeJS.Timeout | null = null;
  private recentEvents: NormalizedEvent[] = [];

  private status: LiveSyncStatus = {
    lastSyncTimestamp: new Date().toISOString(),
    isSyncing: false,
    totalSyncedEvents: 0,
    syncResults: {
      gmail: { status: "IDLE", count: 0 },
      instagram: { status: "IDLE", count: 0 },
      github: { status: "IDLE", count: 0 },
      community: { status: "IDLE", count: 0 },
    },
  };

  constructor() {
    if (process.env.NODE_ENV !== "test") {
      this.startBackgroundSync(20000);
      setTimeout(() => {
        this.syncAll().catch(() => {});
      }, 2000);
    }
  }

  public startBackgroundSync(intervalMs = 20000) {
    if (process.env.NODE_ENV === "test") return;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.syncTimer = setInterval(() => {
      this.syncAll().catch((err) => {
        console.error("[LiveSyncEngine] Scheduled sync error:", err);
      });
    }, intervalMs);
  }

  public getStatus(): LiveSyncStatus {
    return { ...this.status, recentEventsCount: this.recentEvents.length } as any;
  }

  public getRecentEvents(limit = 20): NormalizedEvent[] {
    return this.recentEvents.slice(-limit).reverse();
  }

  public async syncAll(): Promise<LiveSyncStatus> {
    if (this.isSyncing) return this.status;

    this.isSyncing = true;
    this.status.isSyncing = true;
    const now = new Date().toISOString();

    let newEventsCount = 0;

    // 1. Sync Gmail
    try {
      const emails = await gmailConnector.fetchUnreadEmails(15);
      for (const email of emails) {
        const event: NormalizedEvent = {
          event_id: `gmail_${email.id}`,
          source: "EMAIL",
          event_type: "EMAIL_RECEIVED",
          timestamp: email.date || now,
          actor: {
            id: email.from,
            name: email.from.split("<")[0].trim() || email.from,
            handleOrEmail: email.from,
          },
          content: {
            title: email.subject,
            text: email.body || email.snippet,
            rawPayload: { threadId: email.threadId, labels: email.labels },
          },
          metadata: { snippet: email.snippet, labels: email.labels },
          status: "QUEUED",
        };

        this.recordEvent(event);
        await agentOrchestrator.handleEvent(event);
        newEventsCount++;
      }
      this.status.syncResults.gmail = { status: "OK", count: emails.length };
    } catch (err: any) {
      this.status.syncResults.gmail = { status: "ERROR", count: 0, error: err.message };
    }

    // 2. Sync Instagram
    try {
      const igMessages = await instagramConnector.fetchConversations(15);
      for (const msg of igMessages) {
        const event: NormalizedEvent = {
          event_id: `ig_${msg.id}`,
          source: "INSTAGRAM",
          event_type: "INSTAGRAM_DM_RECEIVED",
          timestamp: msg.timestamp || now,
          actor: {
            id: msg.senderId,
            name: msg.senderUsername || "Instagram User",
            handleOrEmail: msg.senderUsername,
          },
          content: {
            text: msg.text,
            rawPayload: { conversationId: msg.conversationId },
          },
          metadata: { conversationId: msg.conversationId },
          status: "QUEUED",
        };

        this.recordEvent(event);
        await agentOrchestrator.handleEvent(event);
        newEventsCount++;
      }
      this.status.syncResults.instagram = { status: "OK", count: igMessages.length };
    } catch (err: any) {
      this.status.syncResults.instagram = { status: "ERROR", count: 0, error: err.message };
    }

    // 3. Sync GitHub
    try {
      const commits = await githubConnector.fetchRecentCommits(5);
      for (const commit of commits) {
        const event: NormalizedEvent = {
          event_id: `git_${commit.sha}`,
          source: "GITHUB",
          event_type: "GIT_COMMIT",
          timestamp: commit.timestamp || now,
          actor: {
            id: commit.authorEmail || commit.authorName,
            name: commit.authorName,
            handleOrEmail: commit.authorEmail,
          },
          content: {
            title: `Commit [${commit.sha}]: ${commit.message}`,
            text: commit.message,
            rawPayload: { sha: commit.sha, url: commit.url, avatar: commit.authorAvatar },
          },
          metadata: { sha: commit.sha, url: commit.url },
          status: "QUEUED",
        };

        this.recordEvent(event);
        await agentOrchestrator.handleEvent(event);
        newEventsCount++;
      }

      const runs = await githubConnector.fetchWorkflowRuns(5);
      for (const run of runs) {
        const event: NormalizedEvent = {
          event_id: `ci_${run.id}_${run.status}`,
          source: "GITHUB",
          event_type: run.conclusion === "failure" ? "CI_FAILURE" : "CI_SUCCESS",
          timestamp: run.updatedAt || now,
          actor: {
            id: "github-actions",
            name: `GitHub Actions (${run.name})`,
          },
          content: {
            title: `CI Run #${run.id} on ${run.headBranch}: ${run.conclusion || run.status}`,
            text: `Workflow ${run.name} for commit ${run.headSha} finished with status ${run.status} (${run.conclusion}).`,
            rawPayload: { runId: run.id, url: run.htmlUrl, branch: run.headBranch },
          },
          metadata: { runId: run.id, url: run.htmlUrl },
          status: "QUEUED",
        };

        this.recordEvent(event);
        await agentOrchestrator.handleEvent(event);
        newEventsCount++;
      }

      this.status.syncResults.github = { status: "OK", count: commits.length + runs.length };
    } catch (err: any) {
      this.status.syncResults.github = { status: "ERROR", count: 0, error: err.message };
    }

    // 4. Sync Community (Discord / Slack)
    try {
      const messages = await communityConnector.fetchRecentMessages(10);
      for (const msg of messages) {
        const event: NormalizedEvent = {
          event_id: `comm_${msg.id}`,
          source: "COMMUNITY",
          event_type: "COMMUNITY_QUESTION",
          timestamp: msg.timestamp || now,
          actor: {
            id: msg.authorId,
            name: msg.authorName,
            handleOrEmail: `@${msg.authorName}`,
          },
          content: {
            text: msg.content,
            rawPayload: { channelId: msg.channelId, platform: msg.platform },
          },
          metadata: { channelId: msg.channelId, platform: msg.platform },
          status: "QUEUED",
        };

        this.recordEvent(event);
        await agentOrchestrator.handleEvent(event);
        newEventsCount++;
      }
      this.status.syncResults.community = { status: "OK", count: messages.length };
    } catch (err: any) {
      this.status.syncResults.community = { status: "ERROR", count: 0, error: err.message };
    }

    this.totalSyncedEvents += newEventsCount;
    this.lastSyncTimestamp = new Date().toISOString();
    this.status.lastSyncTimestamp = this.lastSyncTimestamp;
    this.status.totalSyncedEvents = this.totalSyncedEvents;
    this.status.isSyncing = false;
    this.isSyncing = false;

    auditLogger.log({
      eventId: `sync_${Date.now()}`,
      agent: "AGENT_ORCHESTRATOR",
      actionType: "LIVE_INTEGRATIONS_SYNC",
      confidence: 1.0,
      policyApplied: "SCHEDULED_OR_MANUAL_SYNC",
      status: "SUCCESS",
      explanation: `Completed live multi-channel sync. Ingested ${newEventsCount} new events.`,
      details: this.status as unknown as Record<string, unknown>,
    });

    return this.status;
  }

  private recordEvent(event: NormalizedEvent) {
    // Keep max 100 recent live events in rolling memory
    if (this.recentEvents.some((e) => e.event_id === event.event_id)) return;
    this.recentEvents.push(event);
    if (this.recentEvents.length > 100) {
      this.recentEvents.shift();
    }
  }
}

export const liveSyncEngine = new LiveSyncEngine();
