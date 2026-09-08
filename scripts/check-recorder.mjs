import { execFileSync } from "node:child_process";

const session = process.env.AGENT_BROWSER_SESSION || "recorder-qa";
const base = process.env.RECORDER_URL || "http://localhost:3000/qa/recorder";
const run = (args, input) =>
  execFileSync("agent-browser", ["--session", session, ...args], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
const wait = (ms) => run(["wait", String(ms)]);
const evalPage = (source) => run(["eval", "--stdin"], source);
const assertText = (text) => {
  const page = run(["get", "text", "body"]);
  if (!page.includes(text)) {
    throw new Error(`Expected page text: ${text}`);
  }
};

run(["open", base]);
wait(500);
assertText("Recorder technical QA");
evalPage(`(() => {
  class Track { constructor() { this.stopped = false; this.onended = null; } stop() { this.stopped = true; this.onended?.(); } }
  class Stream { constructor() { this.tracks = [new Track()]; window.__qaLastStream = this; } getTracks() { return this.tracks; } }
  function pcm() {
    const bytes = new ArrayBuffer(32044), v = new DataView(bytes);
    for (const [offset, text] of [[0,"RIFF"],[8,"WAVE"],[12,"fmt "],[36,"data"]]) {
      for(let i=0;i<4;i++) v.setUint8(offset+i,text.charCodeAt(i));
    }
    for(const [offset,value] of [[4,32036],[16,16],[24,16000],[28,32000],[40,32000]]) v.setUint32(offset,value,true);
    for(const [offset,value] of [[20,1],[22,1],[32,2],[34,16]]) v.setUint16(offset,value,true);
    return new Blob([bytes], {type:"audio/wav"});
  }
  class FakeRecorder {
    static isTypeSupported() { return true; }
    constructor(stream, options) { this.stream = stream; this.mimeType = options?.mimeType || "audio/webm"; this.state = "inactive"; }
    start() { this.state = "recording"; setTimeout(() => this.ondataavailable?.({ data: new Blob([]) }), 5); }
    stop() { if (this.state !== "recording") return; this.state = "inactive"; this.ondataavailable?.({ data: pcm() }); this.onstop?.(); }
  }
  window.__qaMode = "ok";
  Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FakeRecorder });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => {
    if (window.__qaMode === "reject") throw new DOMException("blocked", "NotAllowedError");
    if (window.__qaMode === "delay") await new Promise((resolve) => setTimeout(resolve, 100));
    return new Stream();
  } } });
})()`);

// Permission rejection keeps the user on the non-recording surface.
evalPage("window.__qaMode = 'reject'");
run(["find", "role", "button", "click", "--name", "بدء التسجيل"]);
wait(250);
assertText("لم نتمكن من استخدام الميكروفون");

// Consent revoked while permission is pending must stop the late stream.
evalPage("window.__qaMode = 'delay'");
run(["find", "role", "button", "click", "--name", "بدء التسجيل"]);
run(["uncheck", "#qa-consent"]);
wait(150);
if (!evalPage("window.__qaLastStream?.tracks[0].stopped === true").includes("true")) {
  throw new Error("Late permission stream was not stopped after consent revoke");
}

// Successful stop creates a replayable local clip.
run(["check", "#qa-consent"]);
evalPage("window.__qaMode = 'ok'");
run(["find", "role", "button", "click", "--name", "بدء التسجيل"]);
wait(30);
run(["find", "role", "button", "click", "--name", "إيقاف التسجيل"]);
run(["wait", "--text", "استمع إلى المقطع قبل إرساله"]);
assertText("استمع إلى المقطع قبل إرساله");

// Failed upload retains the clip, then retry succeeds.
run(["check", "#qa-fail-upload"]);
run(["find", "role", "button", "click", "--name", "إرسال للوالد"]);
wait(50);
assertText("احتفظنا بالمقطع هنا");
run(["uncheck", "#qa-fail-upload"]);
run(["find", "role", "button", "click", "--name", "إرسال للوالد"]);
wait(50);
assertText("تم الإرسال للوالد");

run(["close"]);
process.stdout.write("PASS: recorder permission, revoke, replay, retry, and cleanup QA\n");
