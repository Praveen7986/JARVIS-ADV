import axios from "axios";
import { auditLogger } from "../auditLog";

export interface RealCommunityMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
  platform: "discord" | "slack";
}

export interface CommunityConnectorConfig {
  platform?: "discord" | "slack" | "telegram" | "simulated";
  botToken?: string;
  channelId?: string;
  webhookUrl?: string;
}

export class CommunityConnector {
  private config: CommunityConnectorConfig = {
    platform: "discord",
  };

  public setConfig(config: CommunityConnectorConfig) {
    this.config = { ...this.config, ...config };
  }

  public async testConnection(): Promise<{
    success: boolean;
    service: string;
    message: string;
    details?: Record<string, unknown>;
  }> {
    const platform = this.config.platform || "discord";
    const token = this.config.botToken || (platform === "discord" ? process.env.DISCORD_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
    const channelId = this.config.channelId || (platform === "discord" ? process.env.DISCORD_CHANNEL_ID : process.env.SLACK_CHANNEL_ID);

    if (!token && !this.config.webhookUrl) {
      return {
        success: true,
        service: `${platform === "discord" ? "Discord Bot" : "Slack App"} Relay`,
        message: "No live bot token configured — Operating in simulated triage mode.",
      };
    }

    if (platform === "discord") {
      try {
        const userRes = await axios.get("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bot ${token}` },
          timeout: 8000,
        });

        let channelName = channelId;
        if (channelId) {
          try {
            const chRes = await axios.get(`https://discord.com/api/v10/channels/${channelId}`, {
              headers: { Authorization: `Bot ${token}` },
              timeout: 8000,
            });
            channelName = `#${chRes.data.name}`;
          } catch {
            // Channel read might be restricted
          }
        }

        return {
          success: true,
          service: "Discord Bot API",
          message: `Connected as ${userRes.data.username}#${userRes.data.discriminator || "0"}. Listening on ${channelName || "all configured channels"}.`,
          details: { botUser: userRes.data.username, channel: channelName },
        };
      } catch (err: any) {
        return {
          success: false,
          service: "Discord Bot API",
          message: `Discord token authentication failed: ${err.response?.data?.message || err.message}`,
        };
      }
    }

    if (platform === "slack") {
      try {
        const testRes = await axios.post(
          "https://slack.com/api/auth.test",
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
          }
        );

        if (testRes.data.ok) {
          return {
            success: true,
            service: "Slack Web API",
            message: `Connected to workspace "${testRes.data.team}" as bot @${testRes.data.user}.`,
            details: testRes.data,
          };
        } else {
          return {
            success: false,
            service: "Slack Web API",
            message: `Slack auth failed: ${testRes.data.error}`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          service: "Slack Web API",
          message: `Slack connection error: ${err.message}`,
        };
      }
    }

    return {
      success: true,
      service: "Community Relay",
      message: "Configured.",
    };
  }

  public async fetchRecentMessages(limit = 10): Promise<RealCommunityMessage[]> {
    const platform = this.config.platform || "discord";
    const token = this.config.botToken || (platform === "discord" ? process.env.DISCORD_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
    const channelId = this.config.channelId || (platform === "discord" ? process.env.DISCORD_CHANNEL_ID : process.env.SLACK_CHANNEL_ID);

    if (!token || !channelId) return [];

    if (platform === "discord") {
      try {
        const res = await axios.get(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
          headers: { Authorization: `Bot ${token}` },
          timeout: 10000,
        });

        return res.data.map((m: any) => ({
          id: m.id,
          channelId,
          authorId: m.author?.id || "unknown",
          authorName: m.author?.username || "Discord Member",
          content: m.content || "",
          timestamp: m.timestamp || new Date().toISOString(),
          platform: "discord" as const,
        }));
      } catch (err: any) {
        console.error("[CommunityConnector] Error fetching Discord messages:", err.message);
        return [];
      }
    }

    if (platform === "slack") {
      try {
        const res = await axios.get(`https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });

        const messages = res.data.messages || [];
        return messages.map((m: any) => ({
          id: m.ts,
          channelId,
          authorId: m.user || "unknown",
          authorName: m.user || "Slack Member",
          content: m.text || "",
          timestamp: new Date(parseFloat(m.ts) * 1000).toISOString(),
          platform: "slack" as const,
        }));
      } catch (err: any) {
        console.error("[CommunityConnector] Error fetching Slack messages:", err.message);
        return [];
      }
    }

    return [];
  }

  public async postReply(channelId: string, content: string, replyToMessageId?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const platform = this.config.platform || "discord";
    const token = this.config.botToken || (platform === "discord" ? process.env.DISCORD_BOT_TOKEN : process.env.SLACK_BOT_TOKEN);
    const targetChannel = channelId || this.config.channelId;

    if (!token || !targetChannel) {
      return { success: true, messageId: `community_sim_${Date.now()}` };
    }

    if (platform === "discord") {
      try {
        const payload: any = { content };
        if (replyToMessageId) {
          payload.message_reference = { message_id: replyToMessageId };
        }

        const res = await axios.post(`https://discord.com/api/v10/channels/${targetChannel}/messages`, payload, {
          headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
          timeout: 10000,
        });

        auditLogger.log({
          eventId: `discord_msg_${res.data.id}`,
          agent: "COMMUNITY_AGENT",
          actionType: "POST_DISCORD_REPLY",
          confidence: 1.0,
          policyApplied: "COMMUNITY_AUTO_TRIAGE",
          status: "SUCCESS",
          explanation: `Posted automated community answer in channel ${targetChannel}.`,
          details: { channelId: targetChannel, messageId: res.data.id },
        });

        return { success: true, messageId: res.data.id };
      } catch (err: any) {
        return { success: false, error: err.response?.data?.message || err.message };
      }
    }

    if (platform === "slack") {
      try {
        const res = await axios.post(
          "https://slack.com/api/chat.postMessage",
          {
            channel: targetChannel,
            text: content,
            thread_ts: replyToMessageId,
          },
          {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            timeout: 10000,
          }
        );

        return { success: res.data.ok, messageId: res.data.ts, error: res.data.error };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: true };
  }
}

export const communityConnector = new CommunityConnector();
