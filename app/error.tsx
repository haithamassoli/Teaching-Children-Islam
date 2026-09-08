"use client";

import Logo from "./components/logo";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="status-page">
      <Logo />
      <p className="status-code">500</p>
      <h1>توقّفت الرحلة للحظة</h1>
      <p>تعذر إكمال هذه الخطوة. حاول مرة أخرى بعد قليل.</p>
      <button type="button" className="primary-button" onClick={retry}>
        إعادة المحاولة
      </button>
      <a href="/">العودة إلى البداية</a>
    </main>
  );
}
