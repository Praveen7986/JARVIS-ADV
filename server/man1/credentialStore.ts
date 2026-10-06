import fs from "fs";
import path from "path";
import { IntegrationCredentials } from "./types";
import { gmailConnector } from "./integrations/gmailConnector";
import { instagramConnector } from "./integrations/instagramConnector";
import { githubConnector } from "./integrations/githubConnector";
import { communityConnector } from "./integrations/communityConnector";

const CONFIG_FILE_PATH = path.resolve(process.cwd(), "server/man1/data/man1_credentials.json");

class CredentialStore {
  private credentials: IntegrationCredentials = {
    gmail: {
      enabled: false,
      authType: "app_password",
      emailAddress: process.env.GMAIL_EMAIL || "",
      appPassword: process.env.GMAIL_APP_PASSWORD || "",
      clientId: process.env.GMAIL_CLIENT_ID || "",
      status: "SIMULATED",
      lastSync: new Date().toISOString(),
    },
    instagram: {
      enabled: false,
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
      pageId: process.env.INSTAGRAM_PAGE_ID || "",
      status: "SIMULATED",
      lastSync: new Date().toISOString(),
    },
    github: {
      enabled: false,
      personalAccessToken: process.env.GITHUB_TOKEN || "",
      repoOwner: process.env.GITHUB_OWNER || "owner",
      repoName: process.env.GITHUB_REPO || "azaris-core",
      status: "SIMULATED",
      lastSync: new Date().toISOString(),
    },
    community: {
      enabled: false,
      platform: "discord",
      botToken: process.env.DISCORD_BOT_TOKEN || process.env.SLACK_BOT_TOKEN || "",
      channelId: process.env.DISCORD_CHANNEL_ID || process.env.SLACK_CHANNEL_ID || "",
      status: "SIMULATED",
      lastSync: new Date().toISOString(),
    },
    mode: "SIMULATED",
  };

  constructor() {
    this.loadFromDisk();
    this.applyToConnectors();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
        const parsed = JSON.parse(raw);
        this.credentials = {
          ...this.credentials,
          ...parsed,
          gmail: { ...this.credentials.gmail, ...parsed.gmail },
          instagram: { ...this.credentials.instagram, ...parsed.instagram },
          github: { ...this.credentials.github, ...parsed.github },
          community: { ...this.credentials.community, ...parsed.community },
        };
      }
    } catch (err: any) {
      console.warn("[CredentialStore] Could not load saved config from disk:", err.message);
    }
  }

  private saveToDisk() {
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.credentials, null, 2), "utf-8");
    } catch (err: any) {
      console.error("[CredentialStore] Failed saving config to disk:", err.message);
    }
  }

  private applyToConnectors() {
    gmailConnector.setConfig({
      emailAddress: this.credentials.gmail.emailAddress,
      appPassword: this.credentials.gmail.appPassword,
      accessToken: process.env.GMAIL_ACCESS_TOKEN,
      clientId: this.credentials.gmail.clientId,
    });

    instagramConnector.setConfig({
      accessToken: this.credentials.instagram.accessToken,
      pageId: this.credentials.instagram.pageId,
      instagramAccountId: this.credentials.instagram.pageId,
    });

    githubConnector.setConfig({
      personalAccessToken: this.credentials.github.personalAccessToken,
      repoOwner: this.credentials.github.repoOwner,
      repoName: this.credentials.github.repoName,
    });

    communityConnector.setConfig({
      platform: this.credentials.community.platform as any,
      botToken: this.credentials.community.botToken,
      channelId: this.credentials.community.channelId,
    });
  }

  public getRawCredentials(): IntegrationCredentials {
    return this.credentials;
  }

  public getCredentials(): IntegrationCredentials {
    return {
      ...this.credentials,
      gmail: {
        ...this.credentials.gmail,
        appPassword: this.credentials.gmail.appPassword
          ? "••••••••••••••••"
          : "",
      },
      instagram: {
        ...this.credentials.instagram,
        accessToken: this.credentials.instagram.accessToken
          ? `${this.credentials.instagram.accessToken.slice(0, 6)}••••••••`
          : "",
      },
      github: {
        ...this.credentials.github,
        personalAccessToken: this.credentials.github.personalAccessToken
          ? `${this.credentials.github.personalAccessToken.slice(0, 4)}••••••••`
          : "",
      },
      community: {
        ...this.credentials.community,
        botToken: this.credentials.community.botToken
          ? `${this.credentials.community.botToken.slice(0, 4)}••••••••`
          : "",
      },
    };
  }

  public updateCredentials(updates: Partial<IntegrationCredentials>): IntegrationCredentials {
    if (updates.gmail) {
      const appPwd =
        updates.gmail.appPassword && !updates.gmail.appPassword.includes("••••")
          ? updates.gmail.appPassword
          : this.credentials.gmail.appPassword;

      this.credentials.gmail = {
        ...this.credentials.gmail,
        ...updates.gmail,
        appPassword: appPwd,
        status: (updates.gmail.emailAddress && appPwd) || updates.gmail.clientId ? "CONNECTED" : "SIMULATED",
        lastSync: new Date().toISOString(),
      };
    }

    if (updates.instagram) {
      const token =
        updates.instagram.accessToken && !updates.instagram.accessToken.includes("••••")
          ? updates.instagram.accessToken
          : this.credentials.instagram.accessToken;

      this.credentials.instagram = {
        ...this.credentials.instagram,
        ...updates.instagram,
        accessToken: token,
        status: token ? "CONNECTED" : "SIMULATED",
        lastSync: new Date().toISOString(),
      };
    }

    if (updates.github) {
      const pat =
        updates.github.personalAccessToken && !updates.github.personalAccessToken.includes("••••")
          ? updates.github.personalAccessToken
          : this.credentials.github.personalAccessToken;

      this.credentials.github = {
        ...this.credentials.github,
        ...updates.github,
        personalAccessToken: pat,
        status: pat ? "CONNECTED" : "SIMULATED",
        lastSync: new Date().toISOString(),
      };
    }

    if (updates.community) {
      const botToken =
        updates.community.botToken && !updates.community.botToken.includes("••••")
          ? updates.community.botToken
          : this.credentials.community.botToken;

      this.credentials.community = {
        ...this.credentials.community,
        ...updates.community,
        botToken: botToken,
        status: botToken ? "CONNECTED" : "SIMULATED",
        lastSync: new Date().toISOString(),
      };
    }

    if (updates.mode) {
      this.credentials.mode = updates.mode;
    }

    this.applyToConnectors();
    this.saveToDisk();

    return this.getCredentials();
  }

  public async testConnection(service: "gmail" | "instagram" | "github" | "community"): Promise<{
    success: boolean;
    service: string;
    message: string;
    timestamp: string;
    details?: Record<string, unknown>;
  }> {
    const timestamp = new Date().toISOString();

    if (service === "gmail") {
      const res = await gmailConnector.testConnection();
      return { ...res, timestamp };
    }
    if (service === "instagram") {
      const res = await instagramConnector.testConnection();
      return { ...res, timestamp };
    }
    if (service === "github") {
      const res = await githubConnector.testConnection();
      return { ...res, timestamp };
    }
    if (service === "community") {
      const res = await communityConnector.testConnection();
      return { ...res, timestamp };
    }

    return {
      success: false,
      service,
      message: "Unknown service.",
      timestamp,
    };
  }
}

export const credentialStore = new CredentialStore();
