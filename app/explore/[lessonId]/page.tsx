import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicQuestion } from "../../../convex/lib/content";
import { arabicNumber, worldArt } from "../../../lib/assets";
import { bookPageText, lessonBundle, lessonForPages, lessons, worlds } from "../../../lib/catalog";
import type { ActivityQuestion } from "../../activity";
import { AnswerText } from "../../components/answer-text";
import { Asset, BookPage, JourneyFooter, JourneyHeader } from "../../components/journey-ui";
import { ReadAloud } from "../../narration";
import LessonPractice from "./practice";

export function generateStaticParams() {
  return lessons.map((lesson) => ({ lessonId: lesson.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = lessons.find((item) => item.id === lessonId);
  return {
    title: lesson?.title ?? "الدرس غير موجود",
    description: lesson ? `${lesson.title}: المحتوى الأصلي كامل بلا تلخيص.` : undefined,
  };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    notFound();
  }
  const world = worlds.find((item) => item.id === lesson.world_id);
  const next = lessons.find(
    (item) => item.world_id === lesson.world_id && item.order === lesson.order + 1,
  );
  const { activities, memory, questions, remembrances, hadiths } = lessonBundle(lesson);
  const hasFullTranscript = lesson.segments.every(
    (segment) => segment.origin === "transcribed_from_book",
  );
  const hasTreasures = memory.length > 0 || hadiths.length > 0 || remembrances.length > 0;
  const memoryHadiths = new Set(
    memory.flatMap((item) => ("hadith_id" in item && item.hadith_id ? [item.hadith_id] : [])),
  );
  return (
    <div className="journey-site">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      <JourneyHeader active="explore" />
      <main className="journey-main" id="content">
        <Link href={`/explore?world=${lesson.world_id}`} className="back-button">
          → العودة إلى عالم {world?.title}
        </Link>
        <section className="world-banner">
          <Asset
            path={`fantasy/worlds/${worldArt(lesson.world_id)}.svg`}
            width={1200}
            height={400}
            className="banner-image"
            preload
          />
          <div>
            <p>
              عالم {world?.title} · الدرس {arabicNumber(lesson.order)} ·{" "}
              {arabicNumber(lesson.estimated_minutes)} دقائق
            </p>
            <h1>{lesson.title}</h1>
          </div>
        </section>
        <div className="reading-layout">
          <aside className="reading-aside">
            <Asset path="fantasy/characters/wameed.webp" width={150} />
            <h2>خذ وقتك يا بطل</h2>
            <p>صفحات الكتاب الأصلية ومحتواها الكامل هنا؛ اقرأ، ثم أجب، ثم طبّق.</p>
            <nav aria-label="أجزاء الدرس">
              {[
                ["read", hasFullTranscript ? "القصة كاملة" : "صفحات الكتاب كاملة", true],
                ["practice", "نتدرّب ونجيب", true],
                ["activities", "أنشطة الكتاب", activities.length > 0],
                ["qa", "سؤال وجواب", questions.length > 0],
                ["memorize", "نحفظ ونذكر", hasTreasures],
                ["apply", "نطبّق معًا", true],
              ]
                .filter(([, , shown]) => shown)
                .map(([id, title], index) => (
                  <a href={`#${id}`} key={String(id)}>
                    {arabicNumber(index + 1)}. {title}
                  </a>
                ))}
            </nav>
            <Link href="/family" className="text-button">
              رحلتي ونجومي ←
            </Link>
          </aside>
          <div>
            <article className="reading-card" id="read">
              <p className="section-kicker">
                {hasFullTranscript ? "النص الكامل" : "من الكتاب مباشرة بلا تلخيص"}
              </p>
              <h2>{lesson.title}</h2>
              {hasFullTranscript &&
                lesson.segments.map((segment, index) => (
                  <div key={segment.id} className="reading-segment" data-narration={segment.text}>
                    <small>الجزء {arabicNumber(index + 1)}</small>
                    <p>{segment.text}</p>
                    <ReadAloud />
                  </div>
                ))}
              <section className="book-pages" aria-label="صفحات الكتاب الأصلية الكاملة">
                {lesson.source_pages.map((page, index) => (
                  <BookPage
                    key={page}
                    page={page}
                    text={bookPageText(page)}
                    preload={index === 0}
                  />
                ))}
              </section>
            </article>
            <LessonPractice
              lessonId={lesson.id}
              questions={lesson.questions.map((question) => {
                const shared = publicQuestion(question);
                return {
                  ...shared,
                  age_instructions: shared.ageInstructions,
                } as ActivityQuestion;
              })}
            />
            {activities.length > 0 && (
              <section id="activities" className="reading-card">
                <p className="section-kicker">أنشطة الكتاب</p>
                <h2>ننفّذ النشاط</h2>
                <p>نفّذ النشاط أولًا، ثم افتح الإجابة وقارنها مع الوالد.</p>
                {activities.map((item) => (
                  <div className="reading-segment" key={item.id}>
                    <small>
                      {item.book_number ? `نشاط ${arabicNumber(item.book_number)}` : "نشاط ومناقشة"}
                    </small>
                    {(Array.isArray(item.prompt) ? item.prompt : [item.prompt]).map((line) => (
                      <p key={line} data-narration={line}>
                        {line}
                        <ReadAloud />
                      </p>
                    ))}
                    <details className="library-entry">
                      <summary>تحقّق من إجابتك</summary>
                      <div className="entry-answer">
                        <AnswerText value={item.answer} />
                        {item.grading !== "exact_structured_answer" && (
                          <small>نقبل المعنى الصحيح؛ يراجع الوالد الإجابة المفتوحة.</small>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </section>
            )}
            {questions.length > 0 && (
              <section id="qa" className="reading-card">
                <p className="section-kicker">سؤال وجواب من الكتاب</p>
                <h2>نسأل ونجيب</h2>
                {questions.map((item) => (
                  <details className="library-entry" key={item.id} data-narration="">
                    <summary data-narration-text>
                      {arabicNumber(Number.parseInt(item.book_number, 10))}
                      {item.book_number.includes("ب") ? "ب" : ""}. {item.question}
                    </summary>
                    <ReadAloud />
                    <div className="entry-answer" data-narration-text>
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </section>
            )}
            {hasTreasures && (
              <section id="memorize" className="reading-card">
                <p className="section-kicker">نحفظ ونذكر</p>
                <h2>كنوز نرددها</h2>
                {memory.map((item) => (
                  <div className="reading-segment" key={item.id}>
                    <small>{item.title}</small>
                    {"names" in item && item.names && <p>{item.names.join(" · ")}</p>}
                    {"quran_ref" in item && item.quran_ref && (
                      <p>
                        السورة {arabicNumber(item.quran_ref.surah)} · الآيات{" "}
                        {arabicNumber(item.quran_ref.from_ayah)}–
                        {arabicNumber(item.quran_ref.to_ayah)} · استمع وكرّر ثم سمّع للوالد.
                      </p>
                    )}
                    {"hadith_id" in item && item.hadith_id && (
                      <p>موضوع هذا الحديث مشروح في مقاطع الدرس أعلاه.</p>
                    )}
                    <p>{item.instructions["8-10"]}</p>
                  </div>
                ))}
                {hadiths
                  .filter((item) => !memoryHadiths.has(item.id))
                  .map((item) => {
                    const source = lessonForPages(item.source_pages);
                    return (
                      <div className="reading-segment" key={item.id}>
                        <small>حديث {arabicNumber(item.book_number)}</small>
                        <p>{item.title}</p>
                        {source && source.id !== lesson.id ? (
                          <Link href={`/explore/${source.id}`} className="quiet-link">
                            اقرأ معناه في درس {source.title} ←
                          </Link>
                        ) : (
                          <p>معناه في مقاطع هذا الدرس أعلاه.</p>
                        )}
                      </div>
                    );
                  })}
                {remembrances.map((item) => (
                  <div className="reading-segment" key={item.id} data-narration={item.text}>
                    <small>ذكر {item.occasion}</small>
                    <p>{item.text}</p>
                    <ReadAloud />
                  </div>
                ))}
                <Link href="/family" className="quiet-link">
                  تسجيل الحفظ والمراجعة ←
                </Link>
              </section>
            )}
            <section id="apply" className="reading-card">
              <p className="section-kicker">من الدرس إلى يومنا</p>
              <h2>نجرّبها معًا</h2>
              {lesson.practice.map((item) => (
                <div key={item.id} data-narration={item.instruction}>
                  <p>{item.instruction}</p>
                  <ReadAloud />
                </div>
              ))}
              <Link href="/family" className="quiet-link">
                تأكيد التطبيق مع الوالد ←
              </Link>
            </section>
            <Link className="source-link" href={`/book?page=${lesson.source_pages[0]}`}>
              اقرأ الكتاب كاملًا داخل الموقع · ص {lesson.source_pages.map(arabicNumber).join("، ")} ←
            </Link>
            <nav className="lesson-navigation" aria-label="التنقل بين الدروس">
              <Link href={`/explore?world=${lesson.world_id}`}>→ دروس العالم</Link>
              {next && (
                <Link className="primary-button" href={`/explore/${next.id}`}>
                  الدرس التالي: {next.title} ←
                </Link>
              )}
            </nav>
          </div>
        </div>
      </main>
      <JourneyFooter />
    </div>
  );
}
