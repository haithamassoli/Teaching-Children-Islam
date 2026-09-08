"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="family-shell">
      <h1>تعذر إكمال هذه الخطوة</h1>
      <p>تحقق من اتصال الإنترنت ثم أعد المحاولة. يمكنك العودة إلى حساب الأسرة لاستئناف الرحلة.</p>
      <button type="button" className="primary-button" onClick={reset}>
        إعادة المحاولة
      </button>
      <a href="/family">حساب الأسرة</a>
    </main>
  );
}
