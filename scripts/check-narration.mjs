import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.env.NARRATION_URL ?? "http://localhost:3000";
const session = process.env.AGENT_BROWSER_SESSION ?? "narration-regression";
const run = (...args) =>
  execFileSync("agent-browser", ["--session", session, ...args], {
    encoding: "utf8",
    stdio: "pipe",
  });
const evaluate = (source) =>
  JSON.parse(
    execFileSync("agent-browser", ["--session", session, "eval", "--stdin"], {
      input: source,
      encoding: "utf8",
      stdio: "pipe",
    }),
  );
const wait = (source) => run("wait", "--fn", `Boolean(${source})`);
const click = (name) => run("find", "role", "button", "click", "--name", name, "--exact");

const temporary = mkdtempSync(join(tmpdir(), "narration-qa-"));
const initScript = join(temporary, "speech.js");
try {
  // Test orchestration deterministically; this does not assess audible voice quality.
  writeFileSync(
    initScript,
    `
    const speech = new EventTarget();
    window.__speech = speech;
    Object.assign(speech, { voices: [], calls: [], active: null, speaking: false, blocked: false });
    speech.getVoices = () => speech.voices;
    speech.cancel = () => {
      const old = speech.active;
      speech.active = null;
      speech.speaking = false;
      old?.onerror?.({error: "canceled"});
    };
    speech.speak = utterance => {
      if (speech.active) throw new Error("Overlapping narration");
      if (speech.blocked) {
        utterance.onerror?.({error: "not-allowed"});
        return;
      }
      speech.calls.push({text: utterance.text, lang: utterance.lang, rate: utterance.rate});
      speech.active = utterance;
      speech.speaking = true;
      utterance.onstart?.();
    };
    speech.finish = () => {
      const old = speech.active;
      speech.active = null;
      speech.speaking = false;
      old?.onend?.();
    };
    Object.defineProperty(window, "speechSynthesis", {value: speech});
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class { constructor(text) { this.text = text; } }
    });
  `,
  );
  run("open", "--init-script", initScript, `${base}/explore/stories-001`);
  wait("document.querySelector('.narration-controls')");
  assert.equal(evaluate("__speech.calls.length"), 0);
  // Voices may arrive after hydration. English must never become the fallback.
  evaluate(`__speech.voices = [{lang: "en-US", default: true}];
    __speech.dispatchEvent(new Event("voiceschanged")); true`);
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  wait("document.querySelector('.narration-controls').textContent.includes('لا يوجد صوت عربي')");
  assert.equal(evaluate("__speech.calls.length"), 0);
  evaluate(`__speech.blocked = true;
    __speech.voices.push({lang: "ar-SA"});
    __speech.dispatchEvent(new Event("voiceschanged")); true`);
  wait("document.querySelector('.narration-controls').textContent.includes('اضغط استمع لتبدأ')");
  evaluate("__speech.blocked = false; true");
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  wait("__speech.calls.length > 0");
  assert.equal(evaluate("__speech.calls.at(-1).lang"), "ar-SA");
  assert.equal(evaluate("__speech.calls.at(-1).rate"), 0.9);
  // Every chunk of a long story is delivered exactly once.
  const story = evaluate(`const segment = document.querySelector('.reading-segment');
    segment.dataset.narration = (segment.dataset.narration + " ").repeat(20);
    segment.dataset.narration`);
  evaluate("__speech.calls = []; true");
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  const spoken = evaluate(`while (__speech.active) __speech.finish();
    __speech.calls.map(call => call.text).join("")`);
  assert.equal(spoken.replace(/\s+/g, " ").trim(), story.replace(/\s+/g, " ").trim());

  click("إيقاف الصوت");
  assert.equal(evaluate("JSON.parse(localStorage.getItem('arabic-narration')).enabled"), false);
  run("select", ".narration-controls select", "0.8");
  run("reload");
  wait("document.querySelector('.narration-controls select')?.value === '0.8'");
  assert.equal(evaluate("__speech.calls.length"), 0);
  evaluate(`__speech.voices = [{lang: "ar-SA"}];
    __speech.dispatchEvent(new Event("voiceschanged")); true`);
  // A manual replay works while automatic narration is off.
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  wait("__speech.active !== null");
  assert.equal(evaluate("__speech.calls.at(-1).rate"), 0.8);
  evaluate("document.querySelector('main').dataset.recording = 'true'; true");
  wait("__speech.active === null");
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  assert.equal(evaluate("__speech.active"), null);
  evaluate("delete document.querySelector('main').dataset.recording; true");
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  evaluate(`const player = document.createElement("audio");
    document.body.append(player); player.dispatchEvent(new Event("play")); true`);
  wait("__speech.active === null");

  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  evaluate(`Object.defineProperty(document, "hidden", {value: true, configurable: true});
    document.dispatchEvent(new Event("visibilitychange")); true`);
  assert.equal(evaluate("__speech.active"), null);
  evaluate(`delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange")); true`);

  // SPA navigation cancels the previous story; closed library answers stay silent.
  run("find", "first", ".reading-segment [data-read-aloud]", "click");
  run("click", '.journey-nav a[href="/library"]');
  run("wait", "--url", "**/library");
  wait("__speech.active === null");
  evaluate("__speech.calls = []; true");
  click("🔇 تشغيل القراءة التلقائية");
  run("scrollintoview", ".library-entry:first-child");
  evaluate("while (__speech.active) __speech.finish(); true");
  run("click", ".library-entry:first-child summary");
  wait("document.querySelector('.library-entry').hasAttribute('data-narration-active')");
  run("click", ".library-entry:first-child summary");
  wait("__speech.active === null");

  run("pushstate", `${base}/explore/conduct-006`);
  run("wait", "--url", "**/explore/conduct-006");
  run("scrollintoview", 'section[aria-label="نشاط الفهم"]:last-of-type');
  run("click", 'section[aria-label="نشاط الفهم"]:last-of-type [data-read-aloud]');
  assert.ok(evaluate("__speech.calls.at(-1).text").includes("أنا سكبت الماء"));
  for (const width of [390, 768, 1440]) {
    run("set", "viewport", String(width), "844");
    assert.equal(evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  }
  process.stdout.write(
    "PASS: Arabic voice selection, delayed voices, autoplay retry, full story, mute persistence, speed, recording/media exclusion, SPA navigation, closed answers, choices, mobile layout.\n",
  );
} finally {
  run("close");
  rmSync(temporary, { recursive: true, force: true });
}
