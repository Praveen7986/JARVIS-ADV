import { AuditLogEntry } from "./types";

class AuditLoggerStore {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000;

  public log(entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }

    return fullEntry;
  }

  public listLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }

  public getByEventId(eventId: string): AuditLogEntry[] {
    return this.logs.filter((l) => l.eventId === eventId);
  }

  public getById(id: string): AuditLogEntry | undefined {
    return this.logs.find((l) => l.id === id);
  }
}

export const auditLogger = new AuditLoggerStore();
