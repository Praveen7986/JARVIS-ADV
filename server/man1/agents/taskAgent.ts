import { NormalizedEvent } from "../types";
import { auditLogger } from "../auditLog";
import { duplicatePrevention } from "../duplicatePrevention";

export interface Man1Task {
  id: string;
  title: string;
  dueDate?: string;
  status: "PENDING" | "FOLLOW_UP" | "COMPLETED";
  origin: string;
  timestamp: string;
}

class TaskAgent {
  private tasks: Map<string, Man1Task> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    this.createTask("Review Q3 Operations Architecture blueprint", "2026-09-19T18:00:00Z", "EMAIL_FOLLOWUP");
    this.createTask("Follow up with Sarah on enterprise onboarding", "2026-09-20T10:00:00Z", "CLIENT_REQUEST");
  }

  public createTask(title: string, dueDate?: string, origin = "MANUAL"): Man1Task {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const task: Man1Task = {
      id,
      title,
      dueDate,
      status: "PENDING",
      origin,
      timestamp: new Date().toISOString(),
    };
    this.tasks.set(id, task);

    auditLogger.log({
      eventId: id,
      agent: "TASK_AGENT",
      actionType: "CREATE_TASK",
      confidence: 1.0,
      policyApplied: "TASK_CREATION_POLICY",
      status: "SUCCESS",
      explanation: `Task registered: "${title}". Due: ${dueDate || "Open-ended"}.`,
      details: { task },
    });

    return task;
  }

  public async processTaskEvent(event: NormalizedEvent) {
    if (duplicatePrevention.isEventDuplicate(event.event_id)) {
      return { handled: false, reason: "Duplicate task event ignored" };
    }
    duplicatePrevention.markEventProcessed(event.event_id);

    const title = event.content.title || event.content.text;
    const dueDate = (event.metadata.dueDate as string) || undefined;
    return this.createTask(title, dueDate, event.source);
  }

  public markCompleted(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.status = "COMPLETED";
    }
  }

  public listTasks(): Man1Task[] {
    return Array.from(this.tasks.values());
  }

  public getStats() {
    const list = this.listTasks();
    return {
      active: list.filter((t) => t.status !== "COMPLETED").length,
      completed: list.filter((t) => t.status === "COMPLETED").length,
      approachingDeadline: list.filter((t) => t.status === "PENDING" && t.dueDate).length,
      followUpsScheduled: list.filter((t) => t.status === "FOLLOW_UP").length,
      sleepSchedule: {
        bedtime: "10:40 PM",
        wakeTime: "6:00 AM",
        sleepDurationFormatted: "7h 20m",
        nextWakeCall: "8:00 AM",
      },
      recentTasks: list.slice(0, 20),
    };
  }

  public resetStats() {
    this.tasks.clear();
    this.seedDefaults();
  }
}

export const taskAgent = new TaskAgent();
