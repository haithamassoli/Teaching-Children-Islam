import Link from "next/link";

export default function NotFound() {
  return (
    <main className="family-shell">
      <h1>هذه الصفحة غير متاحة</h1>
      <p>عد إلى الرحلة واختر خطوتك التالية.</p>
      <Link href="/">العودة إلى البداية</Link>
    </main>
  );
}
