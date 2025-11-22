import worker from "@/index";
import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Refresh courses", () => {
  it("responds with a success message", async () => {
    const request = new IncomingRequest("http://example.com");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Cursos actualizados" });
  });
});
