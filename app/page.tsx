import type { Metadata } from "next";
import Link from "next/link";
import { arabicNumber } from "../lib/assets";
import { lessons, worlds } from "../lib/catalog";
import { siteUrl } from "../lib/site";
import { JourneyFriends } from "./components/journey-controls";
import FantasyInvite from "./fantasy/invite";
import { Asset, JourneyFooter, JourneyHeader, WorldCard } from "./components/journey-ui";

export const metadata: Metadata = { alternates: { canonical: siteUrl?.href } };

export default function Home() {
  return (
    <div className="journey-site">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      <JourneyHeader />
      <main id="content" className="journey-main">
        <section className="welcome-hero">
          <div className="welcome-copy">
            <p className="welcome-label">
              <span /> لأبطالنا الصغار من ٦ إلى ١٠ سنوات
            </p>
            <h1>
              قلبٌ صغير،
              <br />
              <em>رحلةٌ كبيرة!</em>
              <span className="heading-spark" aria-hidden="true">
                ✧
              </span>
            </h1>
            <p className="welcome-description">
              هيا نكتشف جمال الإسلام معًا.
              <br />
              قصص نحبّها، ومعانٍ نتعلّمها، وخيرٌ نعيشه كل يوم.
            </p>
            <div className="welcome-buttons">
              <Link className="primary-button" href="/explore" data-sound>
                لنبدأ المغامرة <span aria-hidden="true">←</span>
              </Link>
              <Link className="quiet-link" href="#worlds">
                اكتشف العوالم <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <div className="hero-footnote">
              <Asset path="icons/heart.svg" width={22} />
              على مهلنا، وبصحبة من نحب
            </div>
          </div>
          <div className="welcome-scene">
            <Asset
              path="worlds/faith.webp"
              width={768}
              height={512}
              className="scene-landscape"
              preload
            />
            <div className="scene-sun" aria-hidden="true">
              ✦
            </div>
            <div className="guide-bubble">
              أهلًا يا بطل! <span>أنا رفيق، هيا نتعلّم معًا</span>
            </div>
            <Asset
              path="characters/guide.webp"
              width={440}
              height={440}
              className="scene-guide"
              preload
            />
            <span className="scene-star star-a" aria-hidden="true">
              ✦
            </span>
            <span className="scene-star star-b" aria-hidden="true">
              ✧
            </span>
            <div className="scene-caption">
              <Asset path="icons/map.svg" width={28} />
              <span>
                <b>٧ عوالم تنتظرك</b>
                <small>وكل خطوة فيها اكتشاف جديد</small>
              </span>
            </div>
          </div>
        </section>
        <section className="journey-steps" aria-label="كيف نتعلّم؟">
          {[
            { icon: "book", title: "نتعلّم بحب", text: "دروس قصيرة ومعانٍ قريبة" },
            { icon: "choice", title: "نلعب ونكتشف", text: "أسئلة وترتيب ومطابقة" },
            { icon: "parent", title: "نطبّق معًا", text: "خطوات نعيشها مع الأسرة" },
          ].map((step, index) => (
            <div key={step.icon}>
              <span className={`step-icon step-${index}`}>
                <Asset path={`icons/${step.icon}.svg`} width={30} />
              </span>
              <span>
                <b>{step.title}</b>
                <small>{step.text}</small>
              </span>
            </div>
          ))}
        </section>
        <section id="worlds" className="worlds-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">خريطة مغامرتك</p>
              <h2>
                إلى أين نذهب اليوم؟ <span aria-hidden="true">✦</span>
              </h2>
              <p>اختر عالمًا، وافتح بابًا جديدًا للمعرفة.</p>
            </div>
            <span className="count-pill">{arabicNumber(lessons.length)} درسًا · ٧ عوالم</span>
          </div>
          <div className="explore-grid">
            {worlds.map((world, index) => (
              <WorldCard
                key={world.id}
                world={world}
                count={lessons.filter((lesson) => lesson.world_id === world.id).length}
                index={index}
              />
            ))}
            <Link href="/library" className="library-invite reveal">
              <Asset path="icons/book.svg" width={66} />
              <span className="section-kicker">كنوز صغيرة لكل يوم</span>
              <h3>مكتبتي الجميلة</h3>
              <p>
                أذكاري، وأسئلتي، وجدول حفظي
                <br />
                كلّها في مكان واحد.
              </p>
              <span className="world-enter">افتح المكتبة ←</span>
            </Link>
          </div>
        </section>
        <FantasyInvite />
        <JourneyFriends />
        <section className="family-invite reveal">
          <div>
            <p className="section-kicker">يدًا بيد مع الأسرة</p>
            <h2>كونوا جزءًا من الرحلة</h2>
            <p>ملف لكل طفل، وتقدّم محفوظ، وحفظ وتطبيق بإشراف الوالد.</p>
          </div>
          <Link href="/family" className="primary-button">
            افتح حساب الأسرة <span aria-hidden="true">←</span>
          </Link>
        </section>
      </main>
      <JourneyFooter />
    </div>
  );
}
