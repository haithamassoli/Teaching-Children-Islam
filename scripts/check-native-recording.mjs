import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `native-recording-${Date.now()}`;
const run = (...args) =>
  execFileSync("agent-browser", ["--session", session, ...args], { encoding: "utf8" });
try {
  run(
    "--args",
    "--use-fake-ui-for-media-stream,--use-fake-device-for-media-stream",
    "open",
    `${process.argv[2] ?? "http://localhost:3000"}/qa/recorder`,
  );
  run("find", "role", "button", "click", "--name", "بدء التسجيل");
  run("wait", "--text", "الميكروفون يعمل");
  run("wait", "1200"); // Capture a real encoded audio chunk from Chromium's synthetic microphone.
  run("find", "role", "button", "click", "--name", "إيقاف التسجيل");
  run("wait", "audio");
  const playback = JSON.parse(
    run(
      "eval",
      '(async () => { const audio = document.querySelector("audio"); await audio.play(); return { playing: !audio.paused, ready: audio.readyState }; })()',
    ),
  );
  assert.equal(playback.playing, true);
  assert.ok(playback.ready >= 2);
  run("find", "role", "button", "click", "--name", "حذف المقطع المحلي");
  assert.equal(JSON.parse(run("eval", 'document.querySelectorAll("audio").length')), 0);
  process.stdout.write("PASS: native Chromium MediaRecorder encoding, playback, and discard.\n");
} finally {
  run("close");
}
