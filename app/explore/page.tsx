import type { Metadata } from "next";
import Link from "next/link";
import { arabicNumber, worldArt } from "../../lib/assets";
import { lessons, worlds } from "../../lib/catalog";
import { Asset, JourneyFooter, JourneyHeader } from "../components/journey-ui";

export const metadata: Metadata = { title: "عوالم التعلّم" };

export default async function Explore({
  searchParams,
}: {
  searchParams: Promise<{ world?: string; q?: string }>;
}) {
  const params = await searchParams;
  const world = worlds.find((item) => item.id === params.world);
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const normalize = (text: string) =>
    text.replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا");
  const filtered = lessons.filter(
    (lesson) =>
      (!world || lesson.world_id === world.id) &&
      normalize(`${lesson.title} ${lesson.objective}`).includes(normalize(query)),
  );
  return (
    <div className="journey-site">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      <JourneyHeader active="explore" />
      <main className="journey-main" id="content">
        <div className="catalog-intro">
          <p className="section-kicker">كل خطوة حكاية جديدة</p>
          <h1>عوالم التعلّم</h1>
          <p>اختر ما تحب أن تتعلّمه اليوم. يمكنك القراءة والتدرّب، ثم متابعة رحلتك مع الأسرة.</p>
        </div>
        <div className="catalog-tools">
          <nav className="catalog-tabs" aria-label="اختر عالمًا">
            <Link href="/explore" aria-current={world ? undefined : "page"}>
              كل العوالم
            </Link>
            {worlds.map((item) => (
              <Link
                key={item.id}
                href={`/explore?world=${item.id}`}
                aria-current={world?.id === item.id ? "page" : undefined}
              >
                {item.title}
              </Link>
            ))}
          </nav>
          <search>
            <form className="catalog-search" action="/explore">
              {world && <input type="hidden" name="world" value={world.id} />}
              <label className="sr-only" htmlFor="lesson-search">
                ابحث عن درس
              </label>
              <input
                key={`${world?.id}-${query}`}
                id="lesson-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="ما الذي تريد أن تتعلّمه؟"
                maxLength={100}
              />
              <button type="submit">ابحث</button>
            </form>
          </search>
        </div>
        {world && (
          <section className="world-banner">
            <Asset
              path={`fantasy/worlds/${worldArt(world.id)}.svg`}
              width={1200}
              height={400}
              className="banner-image"
              preload
            />
            <Asset path={`fantasy/badges/${worldArt(world.id)}-earned.svg`} width={82} />
            <div>
              <h2>عالم {world.title}</h2>
              <p>
                {arabicNumber(lessons.filter((lesson) => lesson.world_id === world.id).length)} درسًا
                نكتشفها معًا
              </p>
            </div>
          </section>
        )}
        <p className="section-kicker">
          {arabicNumber(filtered.length)} درسًا {query && `عن «${query}»`}
        </p>
        <div className="lesson-grid">
          {filtered.map((lesson) => (
            <Link
              href={`/explore/${lesson.id}`}
              key={lesson.id}
              className="lesson-tile reveal"
              data-sound
            >
              <div className="lesson-tile-top">
                <span className="lesson-dot">{arabicNumber(lesson.order)}</span>
                <span>
                  {worlds.find((item) => item.id === lesson.world_id)?.title} ·{" "}
                  {arabicNumber(lesson.estimated_minutes)} دقائق
                </span>
              </div>
              <h2>{lesson.title}</h2>
              <p>{lesson.objective}</p>
              <span className="world-enter">
                افتح الدرس <span aria-hidden="true">←</span>
              </span>
            </Link>
          ))}
        </div>
        {!filtered.length && (
          <section className="empty-results">
            <Asset path="icons/book.svg" width={65} />
            <h2>لنجرّب كلمة أخرى</h2>
            <p>لم نجد درسًا بهذا الاسم. العوالم مليئة بأشياء جميلة تنتظرك.</p>
            <Link href="/explore" className="primary-button">
              عرض كل الدروس
            </Link>
          </section>
        )}
        {world?.id === "memorization" && (
          <section className="family-invite">
            <div>
              <h2>دفتر حفظي</h2>
              <p>١٣٠ مقطعًا وسطرًا للحفظ والمراجعة مع الوالد.</p>
            </div>
            <Link href="/library?tab=memorization" className="primary-button">
              افتح جدول الحفظ ←
            </Link>
          </section>
        )}
      </main>
      <JourneyFooter />
    </div>
  );
}
