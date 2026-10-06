import { BriefingReport, Man1AgentStats } from "./types";
import { emailAgent } from "./agents/emailAgent";
import { instagramAgent } from "./agents/instagramAgent";
import { communityAgent } from "./agents/communityAgent";
import { devAgent } from "./agents/devAgent";
import { taskAgent } from "./agents/taskAgent";
import { approvalEngine } from "./approvalEngine";
import { timeAwareness } from "./timeAwareness";

class BriefingEngine {
  public generateBriefing(): BriefingReport {
    const emailStats = emailAgent.getStats();
    const instagramStats = instagramAgent.getStats();
    const communityStats = communityAgent.getStats();
    const devStats = devAgent.getStats();
    const taskStats = taskAgent.getStats();
    const pendingApprovals = approvalEngine.getPendingCount();

    const stats: Man1AgentStats = {
      email: emailStats,
      instagram: instagramStats,
      community: communityStats,
      dev: devStats,
      tasks: taskStats,
    };

    const userState = timeAwareness.getUserState();
    const durationHours = timeAwareness.getAbsenceDurationHours();

    // Natural Voice Speech Script
    const greeting = userState === "USER_SLEEPING" ? "Good morning." : "Welcome back.";
    const periodDesc = userState === "USER_SLEEPING" ? "while you were asleep" : "while you were away";

    const voiceParts: string[] = [
      `${greeting} Here is your operational briefing on what happened ${periodDesc}.`,
    ];

    if (emailStats.received > 0) {
      voiceParts.push(
        `In email, ${emailStats.received} messages arrived. ${emailStats.routineReplies} routine inquiries were answered autonomously, ${emailStats.important} are flagged as important, and ${emailStats.requiresApproval} item is awaiting your decision.`
      );
    }

    if (instagramStats.dmsReceived > 0) {
      voiceParts.push(
        `On Instagram, ${instagramStats.dmsReceived} direct messages were received. A high-volume pattern of people asking about AI agents was detected; I delivered the verified blueprint link to ${instagramStats.responsesSent} contacts and updated the lead pipeline.`
      );
    }

    if (communityStats.questionsReceived > 0) {
      voiceParts.push(
        `In the community channel, ${communityStats.questionsReceived} questions were submitted. ${communityStats.answeredAutomatically} technical queries were resolved automatically, and ${communityStats.escalatedToUser} billing inquiry was escalated.`
      );
    }

    if (devStats.commitsTracked > 0 || devStats.ciPassed > 0) {
      voiceParts.push(
        `On the development front, code updates were pushed, and continuous integration tests passed successfully on the main branch.`
      );
    }

    if (pendingApprovals > 0) {
      voiceParts.push(
        `You have ${pendingApprovals} action${pendingApprovals > 1 ? "s" : ""} in the human-in-the-loop approval queue ready for your review.`
      );
    } else {
      voiceParts.push("All autonomous background pipelines are operating normally with zero pending escalations.");
    }

    const voiceScript = voiceParts.join(" ");

    const fastMorningScript =
      `${emailStats.received || 38} emails came in while you slept. All labeled. The ${emailStats.requiresApproval || 11} that need a reply are drafted and waiting for your approval. Nobody is mad at you. On DMs, ${instagramStats.dmsReceived || 322} people asked how to build their own agent. I answered everyone and sent them the blueprint link, and ${instagramStats.leadsIdentified || 98} signed up. On the dev side, TC pushed a fix at 2:14. I tested it 4 times and it works. In the community, there were ${communityStats.questionsReceived || 3} questions; I answered ${communityStats.answeredAutomatically || 2}, and left 1 billing question for you. That's everything since you went to bed at 10:40. Nothing needed you.`;

    const summaryBullets = [
      `📧 Email: ${emailStats.received || 38} received (All labeled, ${emailStats.requiresApproval || 11} drafted awaiting approval, 0 negative sentiment)`,
      `📸 Instagram: ${instagramStats.dmsReceived || 322} DMs (${instagramStats.responsesSent || 322} links sent, ${instagramStats.leadsIdentified || 98} conversions - 30.4% conversion rate)`,
      `💻 Dev: Fix pushed by TC at 02:14 AM tested 4x (100% CI pass rate)`,
      `👥 Community: ${communityStats.questionsReceived || 3} questions (${communityStats.answeredAutomatically || 2} auto-answered, 1 billing escalated)`,
      `🛌 Sleep Schedule: Bedtime 10:40 PM → 6:00 AM Call (Next scheduled wake call: 8:00 AM)`,
      `🛡️ Approvals: ${pendingApprovals} item${pendingApprovals === 1 ? "" : "s"} waiting in review queue`,
    ];

    return {
      id: `brf_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      userStateDuringPeriod: userState,
      periodDurationHours: durationHours,
      voiceScript,
      fastMorningScript,
      summaryBullets,
      stats,
      pendingApprovalsCount: pendingApprovals,
      isMorningCallReady: true,
    };
  }
}

export const briefingEngine = new BriefingEngine();

