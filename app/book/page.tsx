import type { Metadata } from "next";
import Link from "next/link";
import { arabicNumber } from "../../lib/assets";
import { bookPageCount, bookPageText } from "../../lib/catalog";
import { BookPage, JourneyFooter, JourneyHeader } from "../components/journey-ui";

export const metadata: Metadata = {
  title: "الكتاب الكامل",
  description: "كتاب تعليم الأطفال الإسلام كاملًا داخل الموقع، بلا تلخيص.",
};

export default async function Book({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const requested = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), bookPageCount) : 1;

  return (
    <div className="journey-site">
      <a className="skip-link" href="#content">
        انتقل إلى صفحة الكتاب
      </a>
      <JourneyHeader active="book" />
      <main className="book-reader" id="content">
        <header className="book-reader-header">
          <p className="section-kicker">النص الأصلي كاملًا</p>
          <h1>كتاب تعليم الأطفال الإسلام</h1>
          <p>جميع الصفحات الـ{arabicNumber(bookPageCount)} داخل الموقع، بلا حذف أو تلخيص.</p>
        </header>
        <form className="book-page-picker" action="/book">
          <label htmlFor="book-page">انتقل إلى الصفحة</label>
          <input
            id="book-page"
            name="page"
            type="number"
            min="1"
            max={bookPageCount}
            defaultValue={page}
          />
          <button type="submit">اعرضها</button>
        </form>
        <BookPage page={page} text={bookPageText(page)} preload />
        <nav className="book-reader-nav" aria-label="التنقل بين صفحات الكتاب">
          {page > 1 && <Link href={`/book?page=${page - 1}`}>→ الصفحة السابقة</Link>}
          <span className="book-reader-position">
            {arabicNumber(page)} من {arabicNumber(bookPageCount)}
          </span>
          {page < bookPageCount && <Link href={`/book?page=${page + 1}`}>الصفحة التالية ←</Link>}
        </nav>
      </main>
      <JourneyFooter />
    </div>
  );
}
