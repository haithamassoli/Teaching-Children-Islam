import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { arabicNumber } from "../../lib/assets";
import { activities, hadiths, memoryItems, remembrances, sourceQuestions } from "../../lib/catalog";
import { JourneyFooter, JourneyHeader } from "../components/journey-ui";
import { ReadAloud } from "../narration";

export const metadata: Metadata = { title: "مكتبتي" };
const tabs = [
  { id: "remembrances", title: "أذكاري", count: remembrances.length },
  { id: "memorization", title: "جدول حفظي", count: memoryItems.length },
  { id: "questions", title: "سؤال وجواب", count: sourceQuestions.length },
  { id: "activities", title: "أنشطة الكتاب", count: activities.length },
  { id: "hadiths", title: "أحاديث الكتاب", count: hadiths.length },
];

function AnswerText({ value }: { value: unknown }): ReactNode {
  if (Array.isArray(value)) {
    return (
      <ol>
        {value.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: immutable source answer may contain repeated values.
          <li key={`${index}-${String(item)}`}>
            <AnswerText value={item} />
          </li>
        ))}
      </ol>
    );
  }
  if (value && typeof value === "object") {
    return (
      <dl>
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>
              <AnswerText value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value ?? "")}</span>;
}

function entries(tab: string) {
  switch (tab) {
    case "memorization":
      return memoryItems.map((item) => ({
        id: item.id,
        title: item.title,
        pages: item.source_pages,
        body: (
          <>
            <p>
              {"names" in item
                ? item.names?.join(" · ")
                : "راجع المقطع في المصحف أو الكتاب، وكرّره على مهل ثم سمّعه للوالد."}
            </p>
            {"quran_ref" in item && item.quran_ref && (
              <p>
                السورة {arabicNumber(item.quran_ref.surah)} · الآيات{" "}
                {arabicNumber(item.quran_ref.from_ayah)}–{arabicNumber(item.quran_ref.to_ayah)}
              </p>
            )}
            <small>يمكنك تسجيل التدريب وطلب التسميع من حساب الأسرة.</small>
            <p>
              <Link href="/family" className="quiet-link">
                حفظي ومراجعتي ←
              </Link>
            </p>
          </>
        ),
      }));
    case "questions":
      return sourceQuestions.map((item) => ({
        id: item.id,
        title: `${arabicNumber(Number.parseInt(item.book_number, 10))}${item.book_number.includes("ب") ? "ب" : ""}. ${item.question}`,
        pages: [item.source_page],
        body: <p>{item.answer}</p>,
      }));
    case "activities":
      return activities.map((item) => ({
        id: item.id,
        title: Array.isArray(item.prompt) ? item.prompt.join(" · ") : item.prompt,
        pages: item.source_pages,
        body: (
          <>
            <p>ناقش الإجابة مع الوالد. نقبل المعنى الصحيح في الأسئلة المفتوحة.</p>
            <AnswerText value={item.answer} />
            <div className="catalog-tabs">
              {item.lesson_ids.map((id) => (
                <Link href={`/explore/${id}`} key={id}>
                  الدرس المرتبط ←
                </Link>
              ))}
            </div>
          </>
        ),
      }));
    case "hadiths":
      return hadiths.map((item) => ({
        id: item.id,
        title: `${arabicNumber(item.book_number)}. ${item.title}`,
        pages: item.source_pages,
        body: (
          <>
            <p>
              {item.required_in_memorization_table
                ? "هذا الحديث ضمن جدول الحفظ."
                : "من أحاديث وروايات الكتاب."}
            </p>
            <p>اقرأ النص الكامل في صفحة المصدر مع الوالد.</p>
          </>
        ),
      }));
    default:
      return remembrances.map((item) => ({
        id: item.id,
        title: item.occasion,
        pages: item.source_pages,
        body: <p>{item.text}</p>,
      }));
  }
}

export default async function Library({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const params = await searchParams;
  const tab = tabs.find((item) => item.id === params.tab) ?? tabs[0];
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const filtered = entries(tab.id).filter((item) => item.title.includes(query));
  return (
    <div className="journey-site">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      <JourneyHeader active="library" />
      <main className="journey-main" id="content">
        <section className="catalog-intro" data-narration="">
          <p className="section-kicker">كنوز صغيرة لكل يوم</p>
          <h1 data-narration-text>مكتبتي الجميلة</h1>
          <p data-narration-text>
            ذكرٌ يرافق يومك، وسؤال يفتح فكرك، وخطوة جديدة في الحفظ. افتح البطاقة واستكشفها مع الوالد.
          </p>
        </section>
        <div className="catalog-tools">
          <nav className="catalog-tabs" aria-label="أقسام المكتبة">
            {tabs.map((item) => (
              <Link
                href={`/library?tab=${item.id}`}
                key={item.id}
                aria-current={tab.id === item.id ? "page" : undefined}
              >
                {item.title} <span>{arabicNumber(item.count)}</span>
              </Link>
            ))}
          </nav>
          <search>
            <form className="catalog-search" action="/library">
              <input type="hidden" name="tab" value={tab.id} />
              <label className="sr-only" htmlFor="library-search">
                ابحث في {tab.title}
              </label>
              <input
                key={`${tab.id}-${query}`}
                id="library-search"
                name="q"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder={`ابحث في ${tab.title}…`}
              />
              <button type="submit">ابحث</button>
            </form>
          </search>
        </div>
        <p className="section-kicker">
          {tab.title} · {arabicNumber(filtered.length)} بطاقة
        </p>
        <div className="library-grid">
          {filtered.map((item) => (
            <details className="library-entry" id={item.id} key={item.id} data-narration="">
              <summary data-narration-text>{item.title}</summary>
              <ReadAloud />
              <div className="entry-answer" data-narration-text>
                {item.body}
              </div>
              <a
                className="source-link"
                href={`/api/book#page=${item.pages[0]}`}
                target="_blank"
                rel="noreferrer"
              >
                افتح المصدر · ص {item.pages.map(arabicNumber).join("، ")} ↗
              </a>
            </details>
          ))}
        </div>
        {!filtered.length && (
          <section className="empty-results">
            <h2>لنجرّب كلمة أخرى</h2>
            <Link href={`/library?tab=${tab.id}`} className="primary-button">
              عرض كل البطاقات
            </Link>
          </section>
        )}
      </main>
      <JourneyFooter />
    </div>
  );
}
