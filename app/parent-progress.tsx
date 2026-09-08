"use client";

import { useState } from "react";

export type ProgressSummary = {
  lessons: { completed: number; total: number };
  memorization: { completed: number; total: number };
  practice: { completed: number; total: number };
  firstAttempt: { correct: number; total: number };
  lastActivity?: number;
};
export type ReviewItem = {
  id: string;
  title: string;
  kind: "memorization" | "practice";
  status: string;
  recordingId?: string;
};

function ratio(completed: number, total: number) {
  return total
    ? `${completed} / ${total} (${Math.round((completed / total) * 100)}٪)`
    : "لا عناصر بعد";
}

export default function ParentProgress({
  summary,
  reviews,
  review,
  listen,
  removeRecording,
}: {
  summary: ProgressSummary;
  reviews: ReviewItem[];
  review: (item: ReviewItem, approved: boolean, message: string) => Promise<unknown>;
  listen: (recordingId: string) => Promise<void>;
  removeRecording: (recordingId: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("أحسنت المحاولة، لنتدرّب معًا مرة أخرى.");
  async function act(task: () => Promise<unknown>) {
    if (busy) {
      return;
    }
    if (!navigator.onLine) {
      setNotice("لا يوجد اتصال. أعد المحاولة بعد عودته.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await task();
      setNotice("تم تأكيد العملية.");
    } catch {
      setNotice("تعذر تأكيد العملية. تحقق من الاتصال وصلاحية جلسة الوالد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-card">
      <h2>متابعة التعلّم</h2>
      <dl>
        <dt>إنجاز المراحل</dt>
        <dd>{ratio(summary.lessons.completed, summary.lessons.total)}</dd>
        <dt>الحفظ المعتمد</dt>
        <dd>{ratio(summary.memorization.completed, summary.memorization.total)}</dd>
        <dt>التطبيق مع الوالد</dt>
        <dd>{ratio(summary.practice.completed, summary.practice.total)}</dd>
        <dt>إجابات الفهم الصحيحة من المحاولة الأولى</dt>
        <dd>{ratio(summary.firstAttempt.correct, summary.firstAttempt.total)}</dd>
        <dt>آخر نشاط</dt>
        <dd>
          {summary.lastActivity
            ? new Date(summary.lastActivity).toLocaleString("ar")
            : "لا نشاط بعد"}
        </dd>
      </dl>
      <p>
        نقيس إنجاز الأنشطة والحفظ والتطبيق كلًا على حدة. النجوم ليست تقييمًا لأخلاق الطفل أو تدينه.
      </p>
      <label>
        رسالة تشجيع عند طلب المراجعة
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={300}
        />
      </label>
      {reviews.length === 0 && <p>لا عناصر للمراجعة بعد.</p>}
      {reviews.map((item) => (
        <article key={`${item.kind}-${item.id}`}>
          <h3>{item.title}</h3>
          <p>
            {item.kind === "practice"
              ? "أكد التطبيق الفعلي معك بعد تعلّم الخطوات."
              : "استمع إلى التسجيل أو اطلب التسميع المباشر."}
          </p>
          {item.recordingId && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => listen(item.recordingId as string))}
              >
                استمع إلى التسجيل
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => removeRecording(item.recordingId as string))}
              >
                حذف التسجيل
              </button>
            </>
          )}
          <button
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={() => act(() => review(item, true, "أحسنت!"))}
          >
            {item.kind === "practice" ? "أؤكد التطبيق مع الوالد" : "اعتماد الحفظ / التسميع المباشر"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act(() => review(item, false, message))}
          >
            يحتاج تدريبًا إضافيًا
          </button>
        </article>
      ))}
      <p role="status">{notice}</p>
    </section>
  );
}
