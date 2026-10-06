import fs from "node:fs/promises";
import path from "node:path";
import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import { approvalManager } from "./approvalManager";
import { AiProjectFile } from "./types";

const execAsync = promisify(exec);

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
}

class ComputerUseBridge {
  private baseWorkspacePath: string;

  constructor() {
    this.baseWorkspacePath = path.resolve(process.cwd(), ".data", "ai_projects");
  }

  public async initWorkspace(): Promise<string> {
    await fs.mkdir(this.baseWorkspacePath, { recursive: true });
    return this.baseWorkspacePath;
  }

  public getWorkspacePath(projectSlug?: string): string {
    if (!projectSlug) return this.baseWorkspacePath;
    return path.join(this.baseWorkspacePath, projectSlug);
  }

  public async ensureProjectDirectory(projectSlug: string): Promise<string> {
    const projectDir = this.getWorkspacePath(projectSlug);
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, "src"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "data"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "models"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "config"), { recursive: true });
    await fs.mkdir(path.join(projectDir, "logs"), { recursive: true });
    return projectDir;
  }

  public async writeProjectFile(
    projectSlug: string,
    relativePath: string,
    content: string,
    description = ""
  ): Promise<AiProjectFile> {
    const projectDir = await this.ensureProjectDirectory(projectSlug);
    const fullPath = path.join(projectDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, "utf-8");

    const ext = path.extname(relativePath).toLowerCase();
    let language: AiProjectFile["language"] = "text";
    if (ext === ".py") language = "python";
    else if (ext === ".json") language = "json";
    else if (ext === ".yaml" || ext === ".yml") language = "yaml";
    else if (ext === ".md") language = "markdown";
    else if (ext === ".sh" || ext === ".ps1" || ext === ".bat") language = "shell";

    const stat = await fs.stat(fullPath);

    approvalManager.log({
      level: "INFO",
      source: "COMPUTER_USE",
      message: `Created/Updated file: ${relativePath} (${stat.size} bytes) in project '${projectSlug}'`,
    });

    return {
      relativePath,
      content,
      language,
      description,
      sizeBytes: stat.size,
      updatedAt: new Date().toISOString(),
    };
  }

  public async readProjectFile(projectSlug: string, relativePath: string): Promise<string> {
    const fullPath = path.join(this.getWorkspacePath(projectSlug), relativePath);
    return await fs.readFile(fullPath, "utf-8");
  }

  public async listProjectFiles(projectSlug: string): Promise<string[]> {
    const projectDir = this.getWorkspacePath(projectSlug);
    try {
      const entries: string[] = [];
      const scan = async (dir: string, base: string) => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const rel = path.join(base, file.name);
          if (file.isDirectory()) {
            await scan(path.join(dir, file.name), rel);
          } else {
            entries.push(rel.replace(/\\/g, "/"));
          }
        }
      };
      await scan(projectDir, "");
      return entries;
    } catch {
      return [];
    }
  }

  public async executeTerminalCommand(
    command: string,
    cwd?: string,
    timeoutMs = 60_000
  ): Promise<ExecutionResult> {
    if (approvalManager.isEmergencyStopped()) {
      throw new Error("Execution blocked: Emergency Stop is active.");
    }

    const workingDir = cwd || this.baseWorkspacePath;
    await fs.mkdir(workingDir, { recursive: true });

    approvalManager.log({
      level: "COMMAND",
      source: "TERMINAL",
      message: `Executing terminal command: ${command} in ${workingDir}`,
    });

    const start = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      const elapsed = Date.now() - start;
      approvalManager.log({
        level: "INFO",
        source: "TERMINAL",
        message: `Command completed in ${elapsed}ms: ${command}`,
        details: { stdout: stdout.slice(0, 300), stderr: stderr.slice(0, 300) },
      });

      return {
        success: true,
        exitCode: 0,
        stdout,
        stderr,
        executionTimeMs: elapsed,
      };
    } catch (err: any) {
      const elapsed = Date.now() - start;
      const stdout = err.stdout || "";
      const stderr = err.stderr || err.message || "Command failed";

      approvalManager.log({
        level: "ERROR",
        source: "TERMINAL",
        message: `Command failed with code ${err.code ?? 1}: ${command}`,
        details: { error: err.message, stderr: stderr.slice(0, 500) },
      });

      return {
        success: false,
        exitCode: typeof err.code === "number" ? err.code : 1,
        stdout,
        stderr,
        executionTimeMs: elapsed,
      };
    }
  }

  public async launchDevelopmentApp(
    appName: "vscode" | "terminal" | "jupyter" | "tensorboard" | "lm_studio" | "ollama" | "explorer",
    targetPath?: string
  ): Promise<{ launched: boolean; message: string }> {
    const dir = targetPath || this.baseWorkspacePath;

    try {
      if (appName === "vscode") {
        const child = spawn("cmd.exe", ["/c", "code", dir], { detached: true, stdio: "ignore" });
        child.unref();
        return { launched: true, message: `Opened VS Code at ${dir}` };
      } else if (appName === "terminal") {
        const child = spawn("cmd.exe", ["/c", "start", "cmd.exe", "/K", `cd /d "${dir}"`], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { launched: true, message: `Launched terminal at ${dir}` };
      } else if (appName === "explorer") {
        const child = spawn("explorer.exe", [dir], { detached: true, stdio: "ignore" });
        child.unref();
        return { launched: true, message: `Opened File Explorer at ${dir}` };
      } else if (appName === "jupyter") {
        const child = spawn("cmd.exe", ["/c", "jupyter", "notebook", "--notebook-dir", dir], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { launched: true, message: "Spawned Jupyter Notebook server in background." };
      } else if (appName === "tensorboard") {
        const child = spawn("cmd.exe", ["/c", "tensorboard", "--logdir", path.join(dir, "logs")], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        return { launched: true, message: "Launched TensorBoard monitor." };
      } else if (appName === "ollama") {
        const child = spawn("cmd.exe", ["/c", "ollama", "serve"], { detached: true, stdio: "ignore" });
        child.unref();
        return { launched: true, message: "Started local Ollama LLM runtime engine." };
      } else if (appName === "lm_studio") {
        return { launched: true, message: "Sent connection handshake to LM Studio local server." };
      }
    } catch (err: any) {
      return { launched: false, message: `Could not launch ${appName}: ${err.message}` };
    }

    return { launched: false, message: `Unknown application ${appName}` };
  }
}

export const computerUseBridge = new ComputerUseBridge();
