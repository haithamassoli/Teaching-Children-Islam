// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker(online = false) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const fallback = new Response("offline page");
  const cache = {
    addAll: vi.fn(),
    match: vi.fn(async () => fallback),
    keys: vi.fn(async () => ["rihla-offline-v0", "other-app"]),
    delete: vi.fn(),
  };
  const fetch = vi.fn(() =>
    online ? Promise.resolve(new Response("live page")) : Promise.reject(new Error("offline")),
  );
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { origin: "https://littlemuslim.assoli.site" },
      clients: { claim: vi.fn() },
      addEventListener: (name: string, handler: (event: unknown) => void) => {
        listeners[name] = handler;
      },
    },
    caches: { ...cache, open: async () => cache },
    fetch,
    URL,
    Response,
  });
  return { listeners, cache, fetch, fallback };
}

describe("PWA privacy and offline behavior", () => {
  it("serves an offline fallback for failed navigation and preserves online responses", async () => {
    for (const online of [false, true]) {
      const { listeners } = worker(online);
      const respondWith = vi.fn();
      listeners.fetch({
        request: {
          url: "https://littlemuslim.assoli.site/family",
          method: "GET",
          mode: "navigate",
        },
        respondWith,
      });
      const response = await respondWith.mock.calls[0][0];
      expect(await response.text()).toBe(online ? "live page" : "offline page");
    }
  });

  it("never intercepts APIs, RSC, recordings, or writes", () => {
    const { listeners, fetch, cache } = worker();
    for (const [url, method, mode] of [
      ["/api/assets/private", "GET", "cors"],
      ["/?_rsc=123", "GET", "cors"],
      ["/family", "POST", "navigate"],
      ["https://example.convex.cloud/file", "GET", "cors"],
    ]) {
      const respondWith = vi.fn();
      listeners.fetch({
        request: { url: new URL(url, "https://littlemuslim.assoli.site").href, method, mode },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(cache.match).not.toHaveBeenCalled();
  });

  it("precaches only public assets and deletes only its own old caches", async () => {
    const { listeners, cache } = worker();
    const waitUntil = vi.fn();
    listeners.install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(cache.addAll).toHaveBeenCalledWith(["/offline.html", "/icon.svg"]);
    listeners.activate({ waitUntil });
    await waitUntil.mock.calls[1][0];
    expect(cache.delete.mock.calls).toEqual([["rihla-offline-v0"]]);
  });
});
