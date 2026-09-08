import Link from "next/link";
import Logo from "./components/logo";

export default function NotFound() {
  return (
    <main className="status-page">
      <Logo />
      <p className="status-code">404</p>
      <h1>لنسلك طريقًا آخر</h1>
      <p>لم نعثر على هذه الصفحة. عد إلى البداية لتكمل رحلتك.</p>
      <Link className="primary-button" href="/">
        العودة إلى البداية
      </Link>
    </main>
  );
}
