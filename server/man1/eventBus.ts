import { Man1EventSource, Man1EventType, NormalizedEvent } from "./types";
import { agentOrchestrator } from "./agentOrchestrator";

class EventBusStore {
  private queue: NormalizedEvent[] = [];
  private history: NormalizedEvent[] = [];
  private isProcessing = false;

  public async emit(input: {
    source: Man1EventSource;
    eventType: Man1EventType;
    actor: { id: string; name: string; handleOrEmail?: string; roleOrRelationship?: string };
    content: { title?: string; text: string; rawPayload?: Record<string, unknown> };
    metadata?: Record<string, unknown>;
    authorizationContext?: { isSensitive?: boolean; isFinancial?: boolean; isLegal?: boolean };
  }): Promise<NormalizedEvent> {
    const event: NormalizedEvent = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source: input.source,
      event_type: input.eventType,
      timestamp: new Date().toISOString(),
      actor: input.actor,
      content: input.content,
      metadata: input.metadata || {},
      authorization_context: input.authorizationContext,
      status: "QUEUED",
    };

    this.queue.push(event);
    this.history.unshift(event);
    if (this.history.length > 200) this.history.pop();

    await this.processQueue();
    return event;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) break;

      try {
        event.status = "PROCESSING";
        await agentOrchestrator.handleEvent(event);
        event.status = "PROCESSED";
      } catch (err) {
        console.error(`[MAN1 EventBus] Error processing event ${event.event_id}:`, err);
        event.status = "FAILED";
      }
    }

    this.isProcessing = false;
  }

  public getRecentEvents(limit = 50): NormalizedEvent[] {
    return this.history.slice(0, limit);
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}

export const eventBus = new EventBusStore();
