"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Asset } from "./components/journey-ui";
import Logo from "./components/logo";
import LearningJourney from "./learning-journey";
import ReviewPanel from "./review-panel";

type Screen = "signIn" | "signUp";

export default function FamilyApp() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) {
    return (
      <main className="family-shell">
        <p>يُجهّز حساب الأسرة…</p>
      </main>
    );
  }
  return isAuthenticated ? <FamilyHome /> : <AccountGate />;
}

function AccountGate() {
  const { signIn } = useAuthActions();
  const [screen, setScreen] = useState<Screen>("signIn");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "");
    const password = String(values.get("password") ?? "");
    setBusy(true);
    setMessage("");
    try {
      await signIn("password", { flow: screen, email, password });
      setMessage("يجري تأكيد الدخول…");
    } catch {
      setMessage("تعذر إكمال الطلب. تحقّق من البيانات ثم حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };
  const title = screenTitle(screen);
  return (
    <main className="family-shell auth-welcome">
      <div className="auth-illustration">
        <Asset path="fantasy/characters/ghayma.webp" width={380} />
        <h2>أهلًا بالأسرة الجميلة</h2>
        <p>معًا نزرع حب التعلّم، ونفرح بكل خطوة صغيرة.</p>
      </div>
      <section className="account-card">
        <Logo />
        <p className="section-kicker">رِحلة الإسلام</p>
        <h1>{title}</h1>
        <p>حساب الوالد يحمي ملفات الأطفال وتقدّمهم.</p>
        <form onSubmit={submit}>
          <label>
            البريد الإلكتروني
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            كلمة المرور
            <input
              name="password"
              type="password"
              autoComplete={screen === "signIn" ? "current-password" : "new-password"}
              minLength={8}
              required
            />
          </label>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "جارٍ الإرسال…" : submitLabel(screen)}
          </button>
        </form>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <div className="account-links">
          <button
            type="button"
            onClick={() => {
              setScreen("signIn");
              setMessage("");
            }}
          >
            دخول
          </button>
          <button
            type="button"
            onClick={() => {
              setScreen("signUp");
              setMessage("");
            }}
          >
            حساب جديد
          </button>
        </div>
      </section>
    </main>
  );
}

function FamilyHome() {
  const { signOut } = useAuthActions();
  const children = useQuery(api.children.list);
  const parentStatus = useQuery(api.parent.status);
  const setPin = useAction(api.parent.setPin);
  const unlock = useAction(api.parent.unlock);
  const resetPin = useAction(api.parent.resetPinWithPassword);
  const deleteAccount = useAction(api.parent.deleteAccount);
  const lock = useMutation(api.parent.lock);
  const create = useAction(api.children.create);
  const update = useAction(api.children.update);
  const remove = useAction(api.children.remove);
  const chooseCharacter = useMutation(api.children.selectCharacter);
  const [parentToken, setParentToken] = useState<string | null>(null);
  const [learningChild, setLearningChild] = useState<{ id: Id<"children">; age: number } | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const lockWhenHidden = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }
      setParentToken(null);
      lock().catch(() => {});
    };
    addEventListener("visibilitychange", lockWhenHidden);
    return () => removeEventListener("visibilitychange", lockWhenHidden);
  }, [lock]);
  const savePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      setParentToken(await setPin({ pin: String(new FormData(event.currentTarget).get("pin")) }));
      setNotice("تم فتح منطقة الوالد لهذه الجلسة.");
    } catch {
      setNotice("تعذر تعيين PIN. يجب أن يتكون من ٤ أرقام.");
    } finally {
      setBusy(false);
    }
  };
  const unlockParent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      setParentToken(await unlock({ pin: String(new FormData(event.currentTarget).get("pin")) }));
      setNotice("تم فتح منطقة الوالد لهذه الجلسة.");
    } catch {
      setNotice("تعذر فتح المنطقة. تحقق من PIN وحاول لاحقًا.");
    } finally {
      setBusy(false);
    }
  };
  const addChild = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parentToken) {
      setNotice("افتح منطقة الوالد بـ PIN قبل إضافة ملف.");
      return;
    }
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    try {
      await create({
        name: String(values.get("name")),
        age: Number(values.get("age")),
        gender: String(values.get("gender")) as "male" | "female",
        parentToken,
      });
      form.reset();
      setNotice("أُضيف ملف الطفل.");
    } catch {
      setNotice("تعذر حفظ الملف. تحقق من الحقول ثم حاول.");
    } finally {
      setBusy(false);
    }
  };
  const changePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      setParentToken(
        await resetPin({
          password: String(values.get("password")),
          pin: String(values.get("pin")),
        }),
      );
      setNotice("تم تغيير PIN وفتح منطقة الوالد.");
    } catch {
      setNotice("تعذر تغيير PIN. تحقّق من كلمة المرور وجرّب مرة أخرى.");
    } finally {
      setBusy(false);
    }
  };
  const lockParent = async () => {
    setParentToken(null);
    try {
      await lock();
      setParentToken(null);
      setNotice("أُقفلت منطقة الوالد.");
    } catch {
      setNotice("تعذر قفل المنطقة. حاول مرة أخرى.");
    }
  };
  const endSession = async () => {
    try {
      await lock();
      await signOut();
    } catch {
      setNotice("تعذر تسجيل الخروج. تحقق من الاتصال ثم حاول.");
    }
  };
  const removeAccount = async () => {
    if (!parentToken) {
      setNotice("افتح منطقة الوالد بـ PIN قبل حذف الحساب.");
      return;
    }
    if (!confirm("سيُحذف الحساب وملفات الأطفال والتقدّم والتسجيلات نهائيًا. هل تريد المتابعة؟")) {
      return;
    }
    setBusy(true);
    try {
      await deleteAccount({ parentToken });
      await signOut();
    } catch {
      setNotice("تعذر تأكيد الحذف. أعد الاتصال للتحقق من حالة الحساب.");
    } finally {
      setBusy(false);
    }
  };
  const startLearning = async (id: Id<"children">, age: number) => {
    if (parentToken) {
      await lockParent();
    }
    setLearningChild({ id, age });
  };
  if (learningChild) {
    return (
      <LearningJourney
        childId={learningChild.id}
        age={learningChild.age}
        onBack={() => setLearningChild(null)}
      />
    );
  }
  return (
    <main className="family-shell">
      <header className="family-header">
        <div>
          <p className="section-kicker">منطقة الأسرة</p>
          <h1>ملفات الأطفال</h1>
        </div>
        <button type="button" className="outline-button" onClick={endSession}>
          تسجيل الخروج
        </button>
      </header>
      {notice && (
        <p className="form-message" role="status">
          {notice}
        </p>
      )}
      <section className="family-grid">
        <article className="account-card">
          <h2>{parentToken ? "منطقة الوالد مفتوحة" : "افتح منطقة الوالد"}</h2>
          <p>
            {parentToken
              ? "يمكنك الآن إدارة ملفات الأطفال في هذه الجلسة."
              : "PIN مكوّن من ٤ أرقام مطلوب لإدارة الملفات."}
          </p>
          <form onSubmit={parentStatus?.hasPin ? unlockParent : savePin}>
            <label>
              PIN الوالد
              <input
                name="pin"
                inputMode="numeric"
                pattern="[0-9]{4}"
                minLength={4}
                maxLength={4}
                required
              />
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={busy || parentStatus === undefined}
            >
              {parentStatus?.hasPin ? "فتح المنطقة" : "تعيين PIN"}
            </button>
          </form>
          <details>
            <summary>استعادة أو تغيير PIN</summary>
            <form onSubmit={changePin}>
              <label>
                كلمة المرور الحالية
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <label>
                PIN جديد من ٤ أرقام
                <input
                  name="pin"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  minLength={4}
                  maxLength={4}
                  required
                />
              </label>
              <button type="submit" className="outline-button" disabled={busy}>
                حفظ PIN الجديد
              </button>
            </form>
          </details>
          {parentToken && (
            <>
              <button type="button" className="text-button" onClick={lockParent}>
                قفل منطقة الوالد
              </button>

              <button
                type="button"
                className="danger-button"
                disabled={busy}
                onClick={removeAccount}
              >
                حذف الحساب والبيانات
              </button>
            </>
          )}
        </article>
        <article className="account-card">
          <h2>إضافة ملف طفل</h2>
          <form onSubmit={addChild}>
            <label>
              الاسم أو الاسم المستعار
              <input name="name" maxLength={40} required />
            </label>
            <label>
              العمر
              <select name="age" defaultValue="6">
                {[6, 7, 8, 9, 10].map((age) => (
                  <option key={age} value={age}>
                    {age} سنوات
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="gender-field">
              <legend>الشخصية</legend>
              <label>
                <input name="gender" type="radio" value="female" defaultChecked /> فتاة
              </label>
              <label>
                <input name="gender" type="radio" value="male" /> فتى
              </label>
            </fieldset>
            <button type="submit" className="primary-button" disabled={busy || !parentToken}>
              إضافة الطفل
            </button>
          </form>
        </article>
      </section>
      <section className="children-live">
        <h2>اختيار ملف الطفل</h2>
        <ChildList
          records={children}
          parentToken={parentToken}
          chooseCharacter={chooseCharacter}
          update={update}
          remove={remove}
          setNotice={setNotice}
          startLearning={startLearning}
        />
      </section>
      {parentToken && <ReviewPanel parentToken={parentToken} />}
    </main>
  );
}

function screenTitle(screen: Screen) {
  if (screen === "signIn") {
    return "دخول الوالد";
  }
  if (screen === "signUp") {
    return "إنشاء حساب للوالد";
  }
  return "دخول الوالد";
}

function submitLabel(screen: Screen) {
  if (screen === "signUp") {
    return "إنشاء الحساب";
  }
  return "دخول";
}

function ChildList({
  records,
  parentToken,
  chooseCharacter,
  update,
  remove,
  setNotice,
  startLearning,
}: {
  records: ReturnType<typeof useQuery<typeof api.children.list>>;
  parentToken: string | null;
  chooseCharacter: ReturnType<typeof useMutation<typeof api.children.selectCharacter>>;
  update: ReturnType<typeof useAction<typeof api.children.update>>;
  remove: ReturnType<typeof useAction<typeof api.children.remove>>;
  setNotice: (message: string) => void;
  startLearning: (id: Id<"children">, age: number) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  if (records === undefined) {
    return <p>يُحمّل ملفات الأطفال…</p>;
  }
  if (records.length === 0) {
    return <p>لا توجد ملفات بعد. افتح منطقة الوالد ثم أضف أول طفل.</p>;
  }
  return (
    <div className="live-child-list">
      {records.map((child) => (
        <article key={child._id}>
          <div className="live-child-avatar">
            <Asset
              path={`characters/${child.characterId || (child.gender === "female" ? "maryam" : "sami")}.webp`}
              width={68}
            />
            <div>
              <b>{child.name}</b>
              <span>{child.age} سنوات</span>
            </div>
          </div>
          <div className="child-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => startLearning(child._id, child.age)}
            >
              ابدأ الرحلة
            </button>
            <select
              aria-label={`شخصية ${child.name}`}
              value={child.characterId ?? ""}
              onChange={(event) =>
                chooseCharacter({ childId: child._id, characterId: event.target.value }).catch(() =>
                  setNotice("تعذر حفظ الشخصية. حاول مرة أخرى."),
                )
              }
            >
              <option value="">اختر الشخصية</option>
              <option value="maryam">مريم</option>
              <option value="nour">نور</option>
              <option value="sami">سامي</option>
              <option value="omar">عمر</option>
            </select>
            <button
              type="button"
              className="outline-button"
              onClick={() => setEditingId(child._id)}
            >
              تعديل
            </button>
            <button
              type="button"
              className="danger-button"
              disabled={!parentToken}
              onClick={() => {
                if (!parentToken) {
                  setNotice("افتح منطقة الوالد قبل الحذف.");
                  return;
                }
                if (!confirm("هل تريد حذف ملف الطفل وبياناته؟")) {
                  return;
                }
                remove({ childId: child._id, parentToken })
                  .then(() => setNotice("حُذف ملف الطفل وبياناته."))
                  .catch(() => setNotice("تعذر حذف الملف. افتح منطقة الوالد ثم حاول."));
              }}
            >
              حذف
            </button>
          </div>
          {editingId === child._id && (
            <form
              className="child-edit"
              onSubmit={(event) => {
                event.preventDefault();
                if (!parentToken) {
                  setNotice("افتح منطقة الوالد قبل التعديل.");
                  return;
                }
                const form = event.currentTarget;
                const values = new FormData(form);
                update({
                  childId: child._id,
                  name: String(values.get("name")),
                  age: Number(values.get("age")),
                  gender: String(values.get("gender")) as "male" | "female",
                  parentToken,
                })
                  .then(() => {
                    setEditingId(null);
                    setNotice("تم تحديث ملف الطفل.");
                  })
                  .catch(() => setNotice("تعذر تحديث الملف."));
              }}
            >
              <label>
                الاسم
                <input name="name" defaultValue={child.name} required />
              </label>
              <label>
                العمر
                <select name="age" defaultValue={child.age}>
                  {[6, 7, 8, 9, 10].map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                النوع
                <select name="gender" defaultValue={child.gender}>
                  <option value="female">فتاة</option>
                  <option value="male">فتى</option>
                </select>
              </label>
              <button type="submit" className="primary-button">
                حفظ التعديل
              </button>
              <button type="button" className="text-button" onClick={() => setEditingId(null)}>
                إلغاء
              </button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
