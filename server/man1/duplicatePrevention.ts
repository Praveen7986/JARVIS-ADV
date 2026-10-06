class DuplicatePreventionStore {
  private processedEvents: Set<string> = new Set();
  private processedActions: Set<string> = new Set();

  public isEventDuplicate(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  public markEventProcessed(eventId: string) {
    this.processedEvents.add(eventId);
  }

  public isActionDuplicate(actionKey: string): boolean {
    return this.processedActions.has(actionKey);
  }

  public markActionExecuted(actionKey: string) {
    this.processedActions.add(actionKey);
  }

  public clear() {
    this.processedEvents.clear;
    this.processedActions.clear();
  }
}

export const duplicatePrevention = new DuplicatePreventionStore();
