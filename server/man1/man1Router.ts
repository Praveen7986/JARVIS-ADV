import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { policyEngine, Man1SystemState, Man1Permissions } from "./policyEngine";
import { timeAwareness } from "./timeAwareness";
import { approvalEngine } from "./approvalEngine";
import { auditLogger } from "./auditLog";
import { explainAction } from "./explainability";
import { briefingEngine } from "./briefingEngine";
import { eventBus } from "./eventBus";
import { worldModel } from "./worldModel";
import { emailAgent } from "./agents/emailAgent";
import { instagramAgent } from "./agents/instagramAgent";
import { communityAgent } from "./agents/communityAgent";
import { devAgent } from "./agents/devAgent";
import { taskAgent } from "./agents/taskAgent";
import { runReferenceOvernightScenario } from "./scenarioRunner";
import { credentialStore } from "./credentialStore";
import { liveSyncEngine } from "./liveSyncEngine";

export const man1Router = router({
  getStatus: publicProcedure.query(() => {
    const permissions = policyEngine.getPermissions();
    const systemState = policyEngine.getSystemState();
    const userState = timeAwareness.getUserState();
    const pendingApprovals = approvalEngine.getPendingCount();
    const emailStats = emailAgent.getStats();
    const igStats = instagramAgent.getStats();
    const commStats = communityAgent.getStats();
    const devStats = devAgent.getStats();
    const taskStats = taskAgent.getStats();
    const rawCreds = credentialStore.getRawCredentials();

    const eventsProcessedToday =
      emailStats.received + igStats.dmsReceived + commStats.questionsReceived + devStats.commitsTracked;
    const autonomousActions =
      emailStats.routineReplies + igStats.responsesSent + commStats.answeredAutomatically;
    const escalations = emailStats.requiresApproval + igStats.escalated + commStats.escalatedToUser;

    return {
      systemState,
      userState,
      permissions,
      mode: rawCreds.mode,
      connectedServices: [
        {
          name: "Email (Gmail / IMAP)",
          connected: Boolean(rawCreds.gmail.emailAddress || rawCreds.gmail.clientId),
          status: rawCreds.gmail.status,
        },
        {
          name: "Instagram Business",
          connected: Boolean(rawCreds.instagram.accessToken),
          status: rawCreds.instagram.status,
        },
        {
          name: "Community Forum (Discord / Slack)",
          connected: Boolean(rawCreds.community.botToken),
          status: rawCreds.community.status,
        },
        {
          name: "GitHub / CI",
          connected: Boolean(rawCreds.github.personalAccessToken),
          status: rawCreds.github.status,
        },
        { name: "JARVIS Tasks & Calendar", connected: true, status: "Active" },
      ],
      agents: [
        { name: "Email Agent", active: permissions.EMAIL_READ },
        { name: "Instagram Agent", active: permissions.INSTAGRAM_READ },
        { name: "Community Agent", active: permissions.COMMUNITY_READ },
        { name: "Dev & CI Agent", active: permissions.GITHUB_READ },
        { name: "Task Agent", active: permissions.TASK_MANAGE },
      ],
      pendingApprovals,
      eventsProcessedToday,
      autonomousActions,
      escalations,
      errorsCount: 0,
    };
  }),

  setSystemState: publicProcedure
    .input(z.object({ state: z.enum(["ACTIVE", "PAUSED", "STOPPED"]) }))
    .mutation(({ input }) => {
      policyEngine.setSystemState(input.state as Man1SystemState);
      return { success: true, systemState: input.state } as const;
    }),

  setUserState: publicProcedure
    .input(z.object({ state: z.enum(["USER_AWAKE", "USER_AWAY", "USER_SLEEPING", "QUIET_HOURS"]) }))
    .mutation(({ input }) => {
      timeAwareness.setUserState(input.state);
      return { success: true, userState: input.state } as const;
    }),

  getBriefing: publicProcedure.query(() => {
    return briefingEngine.generateBriefing();
  }),

  getApprovals: publicProcedure.query(() => {
    return approvalEngine.listAll();
  }),

  decideApproval: publicProcedure
    .input(
      z.object({
        id: z.string(),
        decision: z.enum(["APPROVED", "REJECTED"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const item = await approvalEngine.decide(input.id, input.decision, input.note);
      return { success: true, item } as const;
    }),

  getAuditLogs: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => {
      return auditLogger.listLogs(input?.limit || 100);
    }),

  explainAction: publicProcedure
    .input(z.object({ targetId: z.string() }))
    .query(({ input }) => {
      return { explanation: explainAction(input.targetId) };
    }),

  getAgentStats: publicProcedure.query(() => {
    return {
      email: emailAgent.getStats(),
      instagram: instagramAgent.getStats(),
      community: communityAgent.getStats(),
      dev: devAgent.getStats(),
      tasks: taskAgent.getStats(),
    };
  }),

  getLeads: publicProcedure.query(() => {
    return worldModel.listLeads();
  }),

  getFaqs: publicProcedure.query(() => {
    return worldModel.listFaqs();
  }),

  getRecentEvents: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => {
      return eventBus.getRecentEvents(input?.limit || 50);
    }),

  updatePermission: publicProcedure
    .input(
      z.object({
        key: z.enum([
          "EMAIL_READ",
          "EMAIL_DRAFT",
          "EMAIL_SEND",
          "INSTAGRAM_READ",
          "INSTAGRAM_REPLY",
          "COMMUNITY_READ",
          "COMMUNITY_REPLY",
          "GITHUB_READ",
          "GITHUB_WRITE",
          "TASK_MANAGE",
        ]),
        value: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      policyEngine.updatePermission(input.key as keyof Man1Permissions, input.value);
      return { success: true } as const;
    }),

  simulateReferenceScenario: publicProcedure.mutation(async () => {
    return await runReferenceOvernightScenario();
  }),

  getCredentials: publicProcedure.query(() => {
    return credentialStore.getCredentials();
  }),

  updateCredentials: publicProcedure
    .input(
      z.object({
        gmail: z
          .object({
            enabled: z.boolean().optional(),
            authType: z.enum(["app_password", "oauth2", "simulated"]).optional(),
            emailAddress: z.string().optional(),
            appPassword: z.string().optional(),
            clientId: z.string().optional(),
          })
          .optional(),
        instagram: z
          .object({
            enabled: z.boolean().optional(),
            accessToken: z.string().optional(),
            pageId: z.string().optional(),
          })
          .optional(),
        github: z
          .object({
            enabled: z.boolean().optional(),
            personalAccessToken: z.string().optional(),
            repoOwner: z.string().optional(),
            repoName: z.string().optional(),
          })
          .optional(),
        community: z
          .object({
            enabled: z.boolean().optional(),
            platform: z.enum(["discord", "slack", "telegram", "simulated"]).optional(),
            botToken: z.string().optional(),
            channelId: z.string().optional(),
          })
          .optional(),
        mode: z.enum(["REAL_INGESTION", "HYBRID", "SIMULATED"]).optional(),
      })
    )
    .mutation(({ input }) => {
      return credentialStore.updateCredentials(input as any);
    }),

  testIntegration: publicProcedure
    .input(z.object({ service: z.enum(["gmail", "instagram", "github", "community"]) }))
    .mutation(async ({ input }) => {
      return await credentialStore.testConnection(input.service);
    }),

  syncLiveIntegrations: publicProcedure.mutation(async () => {
    return await liveSyncEngine.syncAll();
  }),

  getLiveSyncStatus: publicProcedure.query(() => {
    return liveSyncEngine.getStatus();
  }),

  getLiveEvents: publicProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(({ input }) => {
      return liveSyncEngine.getRecentEvents(input?.limit || 25);
    }),
});
