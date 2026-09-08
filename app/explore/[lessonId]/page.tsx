import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicQuestion } from "../../../convex/lib/content";
import { arabicNumber, worldArt } from "../../../lib/assets";
import { activities, lessons, memoryItems, worlds } from "../../../lib/catalog";
import type { ActivityQuestion } from "../../activity";
import { Asset, JourneyFooter, JourneyHeader } from "../../components/journey-ui";
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
  return { title: lesson?.title ?? "الدرس غير موجود", description: lesson?.objective };
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
  const related = activities.filter((item) =>
    new Set<string>(lesson.original_activity_ids).has(item.id),
  );
  const memory = memoryItems.filter((item) =>
    new Set<string>(lesson.memorization_ids).has(item.id),
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
            path={`worlds/${worldArt(lesson.world_id)}.webp`}
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
            <Asset path="characters/guide.webp" width={150} />
            <h2>خذ وقتك يا بطل</h2>
            <p>اقرأ جزءًا صغيرًا، وفكّر في معناه. يمكنك أن تطلب من الوالد القراءة معك.</p>
            <nav aria-label="أجزاء الدرس">
              <a href="#read">١. نقرأ ونكتشف</a>
              <a href="#practice">٢. نتدرّب ونجيب</a>
              <a href="#apply">٣. نطبّق معًا</a>
            </nav>
            <Link href="/family" className="text-button">
              رحلتي ونجومي ←
            </Link>
          </aside>
          <div>
            <article className="reading-card" id="read">
              <p className="section-kicker">نقرأ ونكتشف</p>
              <h2>{lesson.title}</h2>
              <div className="instruction">
                <p>{lesson.objective}</p>
              </div>
              {lesson.segments.map((segment, index) => (
                <div key={segment.id} className="reading-segment">
                  <small>الجزء {arabicNumber(index + 1)}</small>
                  <p>{segment.text}</p>
                </div>
              ))}
              <a
                className="source-link"
                href={`/api/book#page=${lesson.source_pages[0]}`}
                target="_blank"
                rel="noreferrer"
              >
                من كتاب تعليم الأطفال الإسلام · ص {lesson.source_pages.map(arabicNumber).join("، ")}
              </a>
            </article>
            <LessonPractice
              lessonId={lesson.id}
              questions={lesson.questions.map(
                (question) => publicQuestion(question) as ActivityQuestion,
              )}
            />
            <section id="apply" className="reading-card">
              <p className="section-kicker">من الدرس إلى يومنا</p>
              <h2>نجرّبها معًا</h2>
              {lesson.practice.map((item) => (
                <p key={item.id}>{item.instruction}</p>
              ))}
              <Link href="/family" className="quiet-link">
                تأكيد التطبيق مع الوالد ←
              </Link>
            </section>
            {related.length > 0 && (
              <section className="reading-card">
                <h2>أنشطة الكتاب</h2>
                {related.map((item) => (
                  <details className="library-entry" key={item.id}>
                    <summary>
                      {Array.isArray(item.prompt) ? item.prompt.join(" · ") : item.prompt}
                    </summary>
                    <p>نفّذ النشاط مع الوالد، ثم راجعا الإجابة في المكتبة.</p>
                    <Link href={`/library?tab=activities#${item.id}`} className="source-link">
                      فتح النشاط وإجابته ←
                    </Link>
                  </details>
                ))}
              </section>
            )}
            {memory.length > 0 && (
              <section className="reading-card">
                <h2>نحفظ ونراجع</h2>
                <div className="catalog-tabs">
                  {memory.map((item) => (
                    <Link href={`/library?tab=memorization#${item.id}`} key={item.id}>
                      {item.title} ←
                    </Link>
                  ))}
                </div>
              </section>
            )}
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
