import axios from "axios";
import { auditLogger } from "../auditLog";

export interface RealGitCommit {
  sha: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  message: string;
  timestamp: string;
  url: string;
}

export interface RealWorkflowRun {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  event: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "timed_out" | "skipped" | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GithubConnectorConfig {
  personalAccessToken?: string;
  repoOwner?: string;
  repoName?: string;
}

export class GithubConnector {
  private config: GithubConnectorConfig = {};

  public setConfig(config: GithubConnectorConfig) {
    this.config = { ...this.config, ...config };
  }

  private getAuthHeaders(token?: string) {
    const pat = token || this.config.personalAccessToken || process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "JARVIS-MAN1-Engine",
    };
    if (pat) {
      headers.Authorization = `Bearer ${pat}`;
    }
    return headers;
  }

  public async testConnection(): Promise<{
    success: boolean;
    service: string;
    message: string;
    details?: Record<string, unknown>;
  }> {
    const token = this.config.personalAccessToken || process.env.GITHUB_TOKEN;
    const owner = this.config.repoOwner || process.env.GITHUB_OWNER || "owner";
    const repo = this.config.repoName || process.env.GITHUB_REPO || "azaris-core";

    if (!token) {
      return {
        success: true,
        service: "GitHub Actions & CI",
        message: "No GitHub token configured — Operating in simulated CI pipeline mode.",
      };
    }

    try {
      // Test user token validity
      const userRes = await axios.get("https://api.github.com/user", {
        headers: this.getAuthHeaders(token),
        timeout: 8000,
      });

      // Test repo access if owner/repo provided
      let repoDetails: Record<string, unknown> = {};
      if (owner && repo && owner !== "owner") {
        try {
          const repoRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: this.getAuthHeaders(token),
            timeout: 8000,
          });
          repoDetails = {
            fullName: repoRes.data.full_name,
            defaultBranch: repoRes.data.default_branch,
            openIssues: repoRes.data.open_issues_count,
            private: repoRes.data.private,
          };
        } catch {
          // repo might be private or not found, user token is still valid
        }
      }

      return {
        success: true,
        service: "GitHub REST API",
        message: `Authenticated as GitHub user @${userRes.data.login}. CI/CD watcher active for target ${owner}/${repo}.`,
        details: {
          user: userRes.data.login,
          avatarUrl: userRes.data.avatar_url,
          ...repoDetails,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        service: "GitHub REST API",
        message: `GitHub token authentication error: ${err.response?.data?.message || err.message}`,
      };
    }
  }

  public async fetchRecentCommits(limit = 10): Promise<RealGitCommit[]> {
    const token = this.config.personalAccessToken || process.env.GITHUB_TOKEN;
    const owner = this.config.repoOwner || process.env.GITHUB_OWNER;
    const repo = this.config.repoName || process.env.GITHUB_REPO;

    if (!owner || !repo) return [];

    try {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
        headers: this.getAuthHeaders(token),
        timeout: 10000,
      });

      return res.data.map((c: any) => ({
        sha: c.sha?.slice(0, 7),
        authorName: c.commit?.author?.name || c.author?.login || "Collaborator",
        authorEmail: c.commit?.author?.email,
        authorAvatar: c.author?.avatar_url,
        message: c.commit?.message?.split("\n")[0] || "No commit message",
        timestamp: c.commit?.author?.date || new Date().toISOString(),
        url: c.html_url,
      }));
    } catch (err: any) {
      console.error("[GithubConnector] Error fetching commits:", err.message);
      return [];
    }
  }

  public async fetchWorkflowRuns(limit = 10): Promise<RealWorkflowRun[]> {
    const token = this.config.personalAccessToken || process.env.GITHUB_TOKEN;
    const owner = this.config.repoOwner || process.env.GITHUB_OWNER;
    const repo = this.config.repoName || process.env.GITHUB_REPO;

    if (!owner || !repo) return [];

    try {
      const res = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${limit}`, {
        headers: this.getAuthHeaders(token),
        timeout: 10000,
      });

      const runs = res.data.workflow_runs || [];
      return runs.map((r: any) => ({
        id: r.id,
        name: r.name,
        headBranch: r.head_branch,
        headSha: r.head_sha?.slice(0, 7),
        event: r.event,
        status: r.status,
        conclusion: r.conclusion,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        htmlUrl: r.html_url,
      }));
    } catch (err: any) {
      console.error("[GithubConnector] Error fetching workflow runs:", err.message);
      return [];
    }
  }

  public async triggerWorkflowRerun(runId: number): Promise<{ success: boolean; error?: string }> {
    const token = this.config.personalAccessToken || process.env.GITHUB_TOKEN;
    const owner = this.config.repoOwner || process.env.GITHUB_OWNER;
    const repo = this.config.repoName || process.env.GITHUB_REPO;

    if (!token || !owner || !repo) {
      return { success: true };
    }

    try {
      await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
        {},
        {
          headers: this.getAuthHeaders(token),
          timeout: 10000,
        }
      );

      auditLogger.log({
        eventId: `rerun_${runId}`,
        agent: "DEV_AGENT",
        actionType: "RERUN_GITHUB_WORKFLOW",
        confidence: 1.0,
        policyApplied: "CI_AUTONOMOUS_RECOVERY",
        status: "SUCCESS",
        explanation: `Triggered GitHub Actions rerun for workflow run #${runId}.`,
        details: { runId, repo: `${owner}/${repo}` },
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }
}

export const githubConnector = new GithubConnector();
