import axios from "axios";
import { auditLogger } from "../auditLog";

export interface RealInstagramMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername?: string;
  text: string;
  timestamp: string;
}

export interface InstagramConnectorConfig {
  accessToken?: string;
  pageId?: string;
  instagramAccountId?: string;
}

export class InstagramConnector {
  private config: InstagramConnectorConfig = {};

  public setConfig(config: InstagramConnectorConfig) {
    this.config = { ...this.config, ...config };
  }

  public async testConnection(): Promise<{
    success: boolean;
    service: string;
    message: string;
    details?: Record<string, unknown>;
  }> {
    const token = this.config.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = this.config.instagramAccountId || this.config.pageId || process.env.INSTAGRAM_ACCOUNT_ID;

    if (!token) {
      return {
        success: true,
        service: "Meta Instagram Graph API",
        message: "No live access token provided — Operating in simulation mode.",
      };
    }

    try {
      const endpoint = accountId
        ? `https://graph.facebook.com/v19.0/${accountId}?fields=id,name,username,followers_count&access_token=${token}`
        : `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`;

      const res = await axios.get(endpoint, { timeout: 8000 });
      return {
        success: true,
        service: "Meta Instagram Graph API",
        message: `Successfully authenticated Meta account: ${res.data.name || res.data.username || res.data.id}. Direct messaging & webhook pipeline active.`,
        details: res.data,
      };
    } catch (err: any) {
      return {
        success: false,
        service: "Meta Instagram Graph API",
        message: `Meta Graph API authentication error: ${err.response?.data?.error?.message || err.message}`,
      };
    }
  }

  public async fetchConversations(limit = 20): Promise<RealInstagramMessage[]> {
    const token = this.config.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = this.config.instagramAccountId || this.config.pageId || process.env.INSTAGRAM_ACCOUNT_ID || "me";

    if (!token) {
      return [];
    }

    try {
      const res = await axios.get(
        `https://graph.facebook.com/v19.0/${accountId}/conversations?fields=id,updated_time,participants,messages{id,message,from,created_time}&limit=${limit}&access_token=${token}`,
        { timeout: 10000 }
      );

      const conversations = res.data.data || [];
      const messages: RealInstagramMessage[] = [];

      for (const conv of conversations) {
        const lastMsg = conv.messages?.data?.[0];
        if (lastMsg) {
          messages.push({
            id: lastMsg.id,
            conversationId: conv.id,
            senderId: lastMsg.from?.id || "unknown_user",
            senderUsername: lastMsg.from?.username || lastMsg.from?.name || `@user_${lastMsg.from?.id?.slice(-4)}`,
            text: lastMsg.message || "",
            timestamp: lastMsg.created_time || conv.updated_time || new Date().toISOString(),
          });
        }
      }

      return messages;
    } catch (err: any) {
      console.error("[InstagramConnector] Error fetching direct messages:", err.message);
      return [];
    }
  }

  public async sendMessage(recipientId: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const token = this.config.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = this.config.instagramAccountId || this.config.pageId || process.env.INSTAGRAM_ACCOUNT_ID || "me";

    if (!token) {
      return { success: true, messageId: `ig_sim_${Date.now()}` };
    }

    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${accountId}/messages`,
        {
          recipient: { id: recipientId },
          message: { text },
        },
        {
          params: { access_token: token },
          timeout: 10000,
        }
      );

      auditLogger.log({
        eventId: `ig_send_${res.data.message_id || Date.now()}`,
        agent: "INSTAGRAM_AGENT",
        actionType: "SEND_INSTAGRAM_DM",
        confidence: 1.0,
        policyApplied: "LEAD_FUNNEL_DISPATCH",
        status: "SUCCESS",
        explanation: `Sent DM response to recipient ${recipientId}.`,
        details: { recipientId, textPreview: text.slice(0, 100) },
      });

      return { success: true, messageId: res.data.message_id };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.error?.message || err.message };
    }
  }
}

export const instagramConnector = new InstagramConnector();
