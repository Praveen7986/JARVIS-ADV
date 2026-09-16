import { spawn } from "node:child_process";

export const APP_NAMES = ["calculator", "notepad", "terminal", "browser"] as const;
export type AppName = (typeof APP_NAMES)[number];

const WINDOWS_COMMANDS: Record<AppName, { command: string; args: string[] }> = {
  calculator: { command: "calc.exe", args: [] },
  notepad: { command: "notepad.exe", args: [] },
  terminal: { command: "cmd.exe", args: [] },
  browser: { command: "cmd.exe", args: ["/c", "start", "", "https://www.google.com"] },
};

export function openApp(app: AppName): void {
  const target = WINDOWS_COMMANDS[app];
  if (!target) throw new Error("That app is not available in the JARVIS allowlist.");

  const child = spawn(target.command, target.args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}
