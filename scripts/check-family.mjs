import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const base = process.env.FAMILY_URL ?? "http://localhost:3000/family";
const stamp = Date.now();
const recoveryPath = process.env.FAMILY_RECOVERY_FILE;
const accounts = recoveryPath
  ? JSON.parse(readFileSync(recoveryPath, "utf8"))
  : ["a", "b"].map((name) => ({
      session: `family-qa-${name}-${stamp}`,
      email: `qa-${name}-${stamp}@example.test`,
      password: randomBytes(24).toString("hex"),
    }));
const run = (account, ...args) => {
  try {
    return execFileSync("agent-browser", ["--session", account.session, ...args], {
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch {
    throw new Error(`Browser command failed: ${args[0]}`);
  }
};
const waitFor = (account, expression) => run(account, "wait", "--fn", expression);
const heading = (account, value) =>
  waitFor(account, `document.querySelector('h1')?.textContent === ${JSON.stringify(value)}`);
const click = (account, value) => run(account, "find", "role", "button", "click", "--name", value);
const fill = (account, selector, value) => run(account, "fill", selector, value);
const pinSelector = '.family-grid article:first-child > form input[name="pin"]';
const pin = (account) => {
  run(account, "wait", pinSelector);
  fill(account, pinSelector, account.pin ?? "1234");
  run(account, "click", '.family-grid article:first-child > form button[type="submit"]');
  waitFor(
    account,
    "[...document.querySelectorAll('h2')].some(x => x.textContent === 'منطقة الوالد مفتوحة')",
  );
};
const addChild = (account, name, age) => {
  fill(account, 'input[name="name"]', name);
  run(account, "select", 'select[name="age"]', String(age));
  click(account, "إضافة الطفل");
  waitFor(
    account,
    `[...document.querySelectorAll('.live-child-list b')].some(x => x.textContent === ${JSON.stringify(name)})`,
  );
};
async function cleanup(account) {
  assert.match(account.email, /^qa-[ab]-\d+@example\.test$/);
  const env = readFileSync(".env.local", "utf8");
  const url = env.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m)?.[1].trim();
  assert.ok(url);
  const client = new ConvexHttpClient(url);
  let login;
  try {
    login = await client.action(anyApi.auth.signIn, {
      provider: "password",
      params: { flow: "signIn", email: account.email, password: account.password },
    });
  } catch (error) {
    if (String(error).includes("InvalidAccountId")) {
      return;
    }
    throw new Error("Test account cleanup login failed");
  }
  assert.ok(login.tokens?.token, "cleanup authentication");
  client.setAuth(login.tokens.token);
  const status = await client.query(anyApi.parent.status, {});
  const parentToken = await client.action(
    status.hasPin ? anyApi.parent.unlock : anyApi.parent.setPin,
    { pin: account.pin ?? "1234" },
  );
  await client.action(anyApi.parent.deleteAccount, { parentToken });
}
let failure;
try {
  if (!recoveryPath) {
    for (const account of accounts) {
      run(account, "open", base);
      run(account, "eval", "localStorage.clear()");
      run(account, "reload");
      heading(account, "دخول الوالد");
      click(account, "حساب جديد");
      fill(account, 'input[name="email"]', account.email);
      fill(account, 'input[name="password"]', account.password);
      click(account, "إنشاء الحساب");
      heading(account, "ملفات الأطفال");
      pin(account);
      process.stdout.write("PASS: synthetic account signup and parent PIN.\n");
    }
    addChild(accounts[0], "QA Child One", 7);
    addChild(accounts[0], "QA Child Two", 9);
    run(accounts[0], "select", 'select[aria-label="شخصية QA Child One"]', "maryam");
    waitFor(
      accounts[0],
      'document.querySelector(\'select[aria-label="شخصية QA Child One"]\')?.value === "maryam"',
    );
    run(accounts[0], "click", ".live-child-list article:first-child button");
    heading(accounts[0], "خريطة العوالم");
    waitFor(
      accounts[0],
      "[...document.querySelectorAll('h2')].some(x => x.textContent === 'حفظي ومراجعتي')",
    );
    assert.ok(run(accounts[0], "get", "text", "body").includes("التطبيق مع الوالد"));
    click(accounts[0], "تغيير الطفل");
    heading(accounts[0], "ملفات الأطفال");
    waitFor(
      accounts[0],
      "[...document.querySelectorAll('h2')].some(x => x.textContent === 'افتح منطقة الوالد')",
    );
    assert.equal(
      JSON.parse(
        run(
          accounts[0],
          "eval",
          "[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='إضافة الطفل')?.disabled",
        ),
      ),
      true,
    );
    run(accounts[0], "click", "summary");
    fill(accounts[0], 'details input[name="password"]', accounts[0].password);
    fill(accounts[0], 'details input[name="pin"]', "4321");
    click(accounts[0], "حفظ PIN الجديد");
    waitFor(
      accounts[0],
      "[...document.querySelectorAll('h2')].some(x => x.textContent === 'منطقة الوالد مفتوحة')",
    );
    accounts[0].pin = "4321";
    click(accounts[0], "قفل منطقة الوالد");
    pin(accounts[0]);
    process.stdout.write("PASS: forgotten PIN recovered using account password.\n");
    assert.ok(!run(accounts[1], "get", "text", "body").includes("QA Child One"));
    assert.equal(
      JSON.parse(
        run(accounts[1], "eval", "document.querySelectorAll('.live-child-list article').length"),
      ),
      0,
    );
    process.stdout.write("PASS: two children, avatar, PIN locking, and household isolation.\n");
  }
} catch (error) {
  failure = error;
}
const remaining = [];
for (const account of accounts) {
  try {
    await cleanup(account);
  } catch {
    remaining.push(account);
  }
  try {
    run(account, "close");
  } catch {
    /* Browser may already be closed after failure. */
  }
}
if (remaining.length) {
  const path = "/tmp/check-family-recovery.json";
  writeFileSync(path, JSON.stringify(remaining), { mode: 0o600 });
  chmodSync(path, 0o600);
  process.stderr.write(`Cleanup pending: ${path}\n`);
  process.exitCode = 1;
} else {
  if (recoveryPath) {
    rmSync(recoveryPath, { force: true });
  }
  process.stdout.write("PASS: synthetic accounts and associated data deleted.\n");
}
if (failure) {
  process.stderr.write(`${failure.message}\n`);
  process.exitCode = 1;
}
