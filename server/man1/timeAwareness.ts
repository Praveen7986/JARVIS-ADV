import { UserOperationalState } from "./types";

class TimeAwarenessStore {
  private currentState: UserOperationalState = "USER_AWAKE";
  private awaySince: Date | null = null;
  private sleepSince: Date | null = null;

  public getUserState(): UserOperationalState {
    return this.currentState;
  }

  public setUserState(state: UserOperationalState) {
    const now = new Date();
    this.currentState = state;
    if (state === "USER_AWAY") {
      this.awaySince = now;
      this.sleepSince = null;
    } else if (state === "USER_SLEEPING") {
      this.sleepSince = now;
      this.awaySince = null;
    } else if (state === "USER_AWAKE") {
      this.awaySince = null;
      this.sleepSince = null;
    }
  }

  public getAbsenceDurationHours(): number {
    const start = this.sleepSince || this.awaySince;
    if (!start) return 8.0; // Default reasonable absence window
    const diffMs = Date.now() - start.getTime();
    return Math.max(0.5, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
  }
}

export const timeAwareness = new TimeAwarenessStore();
