import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `pwa-qa-${Date.now()}`;
const base = new URL(process.argv[2] ?? "http://localhost:3001");
const browser = (...args) =>
  execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8" });
try {
  browser("open", base.href);
  const endpoint = new URL(browser("get", "cdp-url").trim());
  endpoint.protocol = "http:";
  const pages = await (await fetch(`${endpoint.origin}/json/list`)).json();
  const page = pages.find((target) => target.type === "page" && target.url === base.href);
  assert.ok(page);
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  try {
    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Installability check timed out")), 5000);
      socket.onopen = () =>
        socket.send(JSON.stringify({ id: 1, method: "Page.getInstallabilityErrors" }));
      socket.onmessage = ({ data }) => {
        const response = JSON.parse(data);
        if (response.id !== 1) {
          return;
        }
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("CDP connection failed"));
      };
    });
    assert.deepEqual(result.installabilityErrors, []);
  } finally {
    socket.close();
  }
  process.stdout.write("PASS: Chromium reports no PWA installability errors.\n");
} finally {
  browser("close");
}
