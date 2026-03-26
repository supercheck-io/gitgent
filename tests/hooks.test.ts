import { hooks } from "../src/hooks.js";
import type { HookContext } from "../src/hooks.js";

describe("hooks", () => {
  it("emits and receives events", async () => {
    const events: HookContext[] = [];
    const handler = (ctx: HookContext) => { events.push(ctx); };

    hooks.on("run:start", handler);
    await hooks.emit({ event: "run:start", model: "test-model" });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("run:start");
    expect(events[0].model).toBe("test-model");

    hooks.off("run:start", handler);
  });

  it("catches handler errors without throwing", async () => {
    const errorHandler = () => { throw new Error("test error"); };
    hooks.on("run:failed", errorHandler);

    // Should not throw
    await hooks.emit({ event: "run:failed", error: "something went wrong" });

    hooks.off("run:failed", errorHandler);
  });

  it("supports multiple handlers per event", async () => {
    let count = 0;
    const h1 = () => { count += 1; };
    const h2 = () => { count += 10; };

    hooks.on("tool:before", h1);
    hooks.on("tool:before", h2);

    await hooks.emit({ event: "tool:before", toolName: "web_search" });
    expect(count).toBe(11);

    hooks.off("tool:before", h1);
    hooks.off("tool:before", h2);
  });

  it("off removes a specific handler", async () => {
    let called = false;
    const handler = () => { called = true; };

    hooks.on("artifact:created", handler);
    hooks.off("artifact:created", handler);

    await hooks.emit({ event: "artifact:created", artifactPath: "test.md" });
    expect(called).toBe(false);
  });
});
