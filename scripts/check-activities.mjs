import { execFileSync } from "node:child_process";

const session = process.env.AGENT_BROWSER_SESSION || "activities-qa";
const base = process.env.ACTIVITIES_URL || "http://localhost:3000/qa/activities";
const run = (args, input) =>
  execFileSync("agent-browser", ["--session", session, ...args], {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
const wait = (ms) => run(["wait", String(ms)]);
const evalPage = (source) => run(["eval", "--stdin"], source);
const assertText = (text) => {
  if (!run(["get", "text", "body"]).includes(text)) {
    throw new Error(`Expected page text: ${text}`);
  }
};

run(["open", base]);
wait(500);
assertText("Activity technical QA");

// Choice: wrong answer remains retryable, then correct answer passes.
run(["find", "role", "button", "click", "--name", "Wrong"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical retry");
run(["find", "role", "button", "click", "--name", "Correct"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical success");

// Ordering: tapping and reset are available, then the ordered answer passes.
run(["find", "role", "button", "click", "--name", "ordering"]);
run(["find", "role", "button", "click", "--name", "First"]);
run(["find", "role", "button", "click", "--name", "Second"]);
run(["find", "role", "button", "click", "--name", "إعادة الترتيب"]);
run(["find", "role", "button", "click", "--name", "First"]);
run(["find", "role", "button", "click", "--name", "Second"]);
run(["find", "role", "button", "click", "--name", "Third"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical success");

// Matching: set both controlled selects and submit.
run(["find", "role", "button", "click", "--name", "matching"]);
evalPage(`(() => document.querySelectorAll("select").forEach((select, index) => {
  const value = ["Right one", "Right two"][index];
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
  setter.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}))()`);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical success");

// Multiple select: both expected choices are required.
run(["find", "role", "button", "click", "--name", "multi"]);
run(["find", "role", "button", "click", "--name", "Keep"]);
run(["find", "role", "button", "click", "--name", "Also keep"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical success");

// Open response is explicitly routed to parent review.
run(["find", "role", "button", "click", "--name", "open"]);
run(["find", "role", "textbox", "click"]);
run(["fill", "input", "Technical answer"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical review: parent review required");

// Failed submit retains the current answer, then retry succeeds.
run(["find", "role", "button", "click", "--name", "choice"]);
run(["check", "#qa-fail-submit"]);
run(["find", "role", "button", "click", "--name", "Correct"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("احتفظنا باختيارك");
run(["uncheck", "#qa-fail-submit"]);
run(["find", "role", "button", "click", "--name", "تحقق من إجابتي"]);
wait(50);
assertText("Technical success");

run(["close"]);
process.stdout.write(
  "PASS: activity choice, ordering, matching, multi-select, parent review, and retry QA\n",
);
