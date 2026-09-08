import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const base = process.env.JOURNEY_URL ?? "http://localhost:3000";
const session = process.env.AGENT_BROWSER_SESSION ?? "journey-content-qa";
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
const open = (path) => run("open", `${base}${path}`);
const count = (selector) => Number(run("get", "count", selector).trim());
const question = (index) => `section[aria-label="نشاط الفهم"]:nth-of-type(${index})`;
const submit = (index) => run("click", `${question(index)} button.primary-button`);
const bodyHas = (text) => assert.ok(run("get", "text", "body").includes(text), text);

try {
  open("/");
  assert.equal(count(".explore-world"), 7);
  for (const width of [390, 768, 1440]) {
    run("set", "viewport", String(width), "900");
    assert.equal(
      evaluate("document.documentElement.scrollWidth <= innerWidth"),
      true,
      `home overflow at ${width}`,
    );
  }
  run("find", "role", "button", "click", "--name", "إيقاف الحركة");
  assert.equal(
    evaluate("getComputedStyle(document.querySelector('.scene-guide')).animationName"),
    "none",
  );
  run("find", "role", "button", "click", "--name", "تشغيل المؤثرات");
  run("find", "role", "button", "click", "--name", "مريم", "--exact");
  bodyHas("مريم يقول");
  open("/explore");
  assert.equal(count(".lesson-tile"), 111);
  open("/explore?world=conduct");
  assert.equal(count(".lesson-tile"), 16);
  open("/explore?world=faith&q=الملائكة");
  assert.ok(count(".lesson-tile") > 0);
  open("/explore?q=zzzzzz");
  bodyHas("لنجرّب كلمة أخرى");
  for (const [tab, total] of Object.entries({
    remembrances: 26,
    memorization: 130,
    questions: 119,
    activities: 61,
    hadiths: 60,
  })) {
    open(`/library?tab=${tab}`);
    assert.equal(count(".library-entry"), total, tab);
    run("click", ".library-entry:first-child summary");
    assert.equal(evaluate("document.querySelector('.library-entry').open"), true);
  }
  open("/explore/conduct-006");
  assert.equal(
    evaluate(
      "document.querySelector('section[aria-label=\"نشاط الفهم\"] button.primary-button').disabled",
    ),
    true,
    "empty answer rejected",
  );
  run("find", "role", "button", "click", "--name", "فعل ذلك أخي", "--exact");
  submit(3);
  run("wait", "--text", "حاول مرة أخرى");
  run("find", "role", "button", "click", "--name", "أنا سكبت الماء وسأساعد في تنظيفه", "--exact");
  submit(3);
  run("wait", "--text", "الصدق والاعتراف بالخطأ");
  open("/explore/faith-009");
  for (const [index, value] of ["الصحف", "التوراة", "الزبور", "الإنجيل", "القرآن"].entries()) {
    run("select", `${question(3)} label:nth-of-type(${index + 1}) select`, value);
  }
  submit(3);
  run("wait", "--text", "هذا الربط كما في الصفحة");
  open("/explore/faith-001");
  for (const [index, value] of [
    "ستة أركان",
    "الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر",
  ].entries()) {
    run("fill", `${question(index + 1)} input`, value);
    submit(index + 1);
    run(
      "wait",
      "--fn",
      `document.querySelectorAll('section[aria-label="نشاط الفهم"]')[${index}].textContent.includes('ناقش هذه الإجابة')`,
    );
  }
  for (const name of ["الله", "ملائكته", "كتبه", "رسله", "اليوم الآخر", "القدر خيره وشره"]) {
    run("find", "role", "button", "click", "--name", name, "--exact");
  }
  submit(3);
  run("wait", "--text", "أحسنت التعلّم والمحاولة!");
  run("set", "viewport", "390", "844");
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
    "lesson overflow",
  );
  run("click", ".lesson-navigation a.primary-button");
  run("wait", "--url", "**/explore/faith-002");
  open("/family");
  run("wait", "--text", "دخول الوالد");
  assert.equal(
    evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
    "family overflow",
  );
  for (const path of [
    "/api/assets/worlds/faith.webp",
    "/api/assets/worlds/ethics.webp",
    "/api/assets/rewards/celebration.svg",
    "/api/book",
  ]) {
    assert.equal((await fetch(`${base}${path}`)).status, 200, path);
  }
  assert.equal((await fetch(`${base}/explore/not-a-lesson`)).status, 404);
  process.stdout.write(
    "PASS: 111 lessons, all five library sections, Arabic choice/matching/ordering, parent discussion, navigation, mobile layout, animation pause, and source assets.\n",
  );
} finally {
  run("close");
}
