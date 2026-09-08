import type { Metadata } from "next";
import Link from "next/link";
import catalog from "../../assets/fantasy/catalog.json";
import { arabicNumber } from "../../lib/assets";
import { Asset, JourneyFooter } from "../components/journey-ui";
import styles from "./fantasy.module.css";

export const metadata: Metadata = {
  title: "جزر العجائب",
  description: "رفاق كيوت من النجوم والسحب، وسبع جزر خيالية وكنوز وشارات لرحلة التعلّم.",
  alternates: { canonical: "/fantasy" },
};

export default function FantasyPage() {
  return (
    <div className={`journey-site ${styles.page}`}>
      <a className="skip-link" href="#fantasy-content">
        انتقل إلى المحتوى
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span aria-hidden="true">✦</span> رِحلة الإسلام <small>جزر العجائب</small>
        </Link>
        <Link href="/">
          العودة إلى الرحلة <span aria-hidden="true">←</span>
        </Link>
      </header>
      <main id="fantasy-content" className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>من هنا يبدأ الخيال</span>
            <h1>
              أهلًا بك في
              <br />
              <em>جزر العجائب!</em>
            </h1>
            <p>
              فوق السحاب، ينتظرك أصدقاء لم تقابل مثلهم.
              <br />
              نجمة فضولية، وغيمة تحمل حكاية… ومغامرة تشبهك.
            </p>
            <a href="#friends" className={styles.button}>
              قابل أصدقاءك الجدد <span aria-hidden="true">↓</span>
            </a>
            <span className={styles.heroNote}>٤ رفاق · ٧ جزر · خيال بلا حدود</span>
          </div>
          <div className={styles.scene}>
            <Asset
              path="fantasy/worlds/faith.svg"
              width={900}
              height={600}
              className={styles.heroWorld}
              preload
            />
            <Asset
              path="fantasy/characters/wameed.webp"
              width={300}
              height={300}
              className={styles.heroFriend}
              preload
            />
            <Asset
              path="fantasy/characters/ghayma.webp"
              width={190}
              height={190}
              className={styles.cloudFriend}
            />
            <span className={styles.sceneLabel}>
              كل جزيرة… حكاية جديدة <span aria-hidden="true">✧</span>
            </span>
          </div>
        </section>
        <nav className={styles.nav} aria-label="استكشف جزر العجائب">
          <a href="#friends">رفاق الرحلة</a>
          <a href="#islands">الجزر السبعة</a>
          <a href="#adventures">ألعاب وأدوات</a>
          <a href="#treasures">الجوائز والشارات</a>
        </nav>
        <section id="friends" className={styles.section}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>صغار في الحجم، كبار في الفضول</span>
            <h2>أصدقاء من عالم آخر</h2>
            <p>افتح بطاقة صديقك، ودعه يعرّفك بنفسه.</p>
          </div>
          <div className={styles.friends}>
            {catalog.characters.map((friend) => (
              <details
                key={friend.id}
                className={styles.friend}
                style={{ background: friend.color }}
              >
                <summary>
                  <Asset path={friend.path} width={260} alt={friend.description} />
                  <h3>{friend.name}</h3>
                  <p>{friend.description}</p>
                  <span className={styles.friendAction}>
                    تعرّف إليّ <span aria-hidden="true">＋</span>
                  </span>
                </summary>
                <p className={styles.greeting}>{friend.greeting}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="islands" className={styles.section}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>خريطة الخيال</span>
            <h2>اختر جزيرة… واتبع فضولك</h2>
            <p>أماكن خيالية ترافق عوالم التعلّم السبعة.</p>
          </div>
          <div className={styles.worlds}>
            {catalog.worlds.map((world, index) => (
              <article key={world.id} className={styles.world}>
                <div className={styles.worldImage}>
                  <Asset path={world.path} width={900} height={600} alt={world.description} />
                  <span>{arabicNumber(index + 1).padStart(2, "٠")}</span>
                </div>
                <div className={styles.worldCopy}>
                  <Asset path={world.badge} width={62} />
                  <h3>{world.name}</h3>
                  <p>{world.description}</p>
                  <Link href={`/explore?world=${world.learningWorld}`}>
                    استكشف دروس العالم <span aria-hidden="true">←</span>
                  </Link>
                </div>
              </article>
            ))}
            <article className={styles.postcard}>
              <Asset path="fantasy/objects/compass.svg" width={145} />
              <span className={styles.eyebrow}>كل الطرق تبدأ بخطوة</span>
              <h3>أين تأخذك بوصلة اليوم؟</h3>
              <p>خذ وقتك. في كل مرة نكتشف شيئًا جديدًا.</p>
              <Link href="/explore" className={styles.button}>
                إلى عوالم التعلّم ←
              </Link>
            </article>
          </div>
        </section>
        <section id="adventures" className={styles.section}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>للخيال ألف طريقة</span>
            <h2>ألعاب صغيرة، واكتشافات كثيرة</h2>
            <p>بوابات وجسور ومسار من السحب لقوالب أنشطة الرحلة.</p>
          </div>
          <div className={styles.items}>
            {catalog.activities.map((item) => (
              <article key={item.id}>
                <Asset path={item.path} width={160} />
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <div className={styles.toolShelf}>
            <div>
              <span className={styles.eyebrow}>في حقيبة المغامر</span>
              <h3>أدوات من الخيال</h3>
              <p>
                فانوس وبوصلة ومفتاح وصندوق…
                <br />
                تفاصيل صغيرة تكمل حكاية الجزر.
              </p>
            </div>
            <div className={styles.tools}>
              {catalog.objects.map((item) => (
                <figure key={item.id}>
                  <Asset path={item.path} width={120} />
                  <figcaption>{item.name}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
        <section id="treasures" className={`${styles.section} ${styles.treasures}`}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>لكل خطوة فرحتها</span>
            <h2>كنوز تستحق المحاولة</h2>
            <p>نجوم للمراحل، وشارة لإكمال دروس كل عالم. هذه معاينة لأشكالها.</p>
          </div>
          <div className={styles.rewardDisplay}>
            <Asset path="fantasy/rewards/celebration.svg" width={95} />
            <div>
              <Asset path="fantasy/rewards/world-complete.svg" width={170} />
              <h3>كأس الجزيرة</h3>
            </div>
            <div>
              <Asset path="fantasy/rewards/stars-3.svg" width={225} height={76} />
              <h3>نجوم المحاولة والإنجاز</h3>
              <p>كل مرحلة لها حكايتها.</p>
            </div>
          </div>
          <div className={styles.badges}>
            {catalog.worlds.map((world) => (
              <figure key={world.id}>
                <Asset path={world.badge} width={140} />
                <figcaption>{world.name}</figcaption>
              </figure>
            ))}
          </div>
          <details className={styles.locked}>
            <summary>كيف تبدو الشارات قبل اكتسابها؟</summary>
            <div className={styles.badges}>
              {catalog.worlds.map((world) => (
                <figure key={world.id}>
                  <Asset path={`fantasy/badges/${world.id}-locked.svg`} width={110} />
                  <figcaption>{world.name}</figcaption>
                </figure>
              ))}
            </div>
          </details>
        </section>
        <section className={styles.originals}>
          <div>
            <span className={styles.eyebrow}>الرحلة تتّسع للجميع</span>
            <h2>وأصدقاؤنا الأوائل ما زالوا هنا</h2>
            <p>سامي ومريم وعمر ونور ورفيق، أصدقاء البدايات الجميلة.</p>
            <Link href="/">تابع رحلة التعلّم ←</Link>
          </div>
          <div>
            {[
              { id: "sami", name: "سامي" },
              { id: "maryam", name: "مريم" },
              { id: "omar", name: "عمر" },
              { id: "nour", name: "نور" },
              { id: "guide", name: "رفيق" },
            ].map((friend) => (
              <figure key={friend.id}>
                <Asset path={`characters/${friend.id}.webp`} width={105} />
                <figcaption>{friend.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
      <JourneyFooter />
    </div>
  );
}
