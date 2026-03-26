/**
 * Lifecycle hooks — extensibility events for gitgent runs.
 *
 * Lifecycle hooks allow the runtime to react to events without coupling
 * to specific implementation details.
 */

export type HookEvent =
  | "run:start"
  | "run:complete"
  | "run:failed"
  | "tool:before"
  | "tool:after"
  | "artifact:created"
  | "memory:written";

export interface HookContext {
  event: HookEvent;
  issueNumber?: number;
  skill?: string | null;
  model?: string;
  toolName?: string;
  artifactPath?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => void | Promise<void>;

class HookRegistry {
  private handlers = new Map<HookEvent, HookHandler[]>();

  on(event: HookEvent, handler: HookHandler): void {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);
  }

  off(event: HookEvent, handler: HookHandler): void {
    const existing = this.handlers.get(event) || [];
    this.handlers.set(
      event,
      existing.filter((h) => h !== handler),
    );
  }

  async emit(context: HookContext): Promise<void> {
    const handlers = this.handlers.get(context.event) || [];
    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(
          `Hook error (${context.event}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

/** Singleton hook registry for the current run. */
export const hooks = new HookRegistry();
