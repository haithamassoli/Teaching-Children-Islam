"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type View = "map" | "lesson" | "activity" | "reward" | "parent";
const asset = (path: string) => `/api/assets/${path}`;
const children = [
  { name: "مريم", age: "٨ سنوات", image: "characters/maryam.webp" },
  { name: "سامي", age: "٦ سنوات", image: "characters/sami.webp" },
  { name: "نور", age: "٩ سنوات", image: "characters/nour.webp" },
  { name: "عمر", age: "٧ سنوات", image: "characters/omar.webp" },
];
const worlds = [
  ["عالم الإيمان", "المرحلة التالية: أركان الإيمان", "worlds/faith.webp", "ابدأ"],
  ["عالم الآداب", "المرحلة الأولى متاحة", "worlds/manners.webp", "ابدأ"],
  ["عالم الأخلاق", "المرحلة الأولى متاحة", "worlds/ethics.webp", "ابدأ"],
  ["عالم العبادات", "المرحلة الأولى متاحة", "worlds/worship.webp", "ابدأ"],
  ["عالم القرآن", "المرحلة الأولى متاحة", "worlds/quran.webp", "ابدأ"],
  ["عالم القصص", "المرحلة الأولى متاحة", "worlds/stories.webp", "ابدأ"],
  ["عالم الحفظ", "المرحلة الأولى متاحة", "worlds/memorization.webp", "ابدأ"],
];

export default function Home() {
  const [view, setView] = useState<View>("map");
  const [childIndex, setChild] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(true);
  const [age, setAge] = useState<"6-7" | "8-10">("6-7");
  const guideAudio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    addEventListener("online", sync);
    addEventListener("offline", sync);
    return () => {
      removeEventListener("online", sync);
      removeEventListener("offline", sync);
    };
  }, []);
  const go = (next: View) => {
    setNotice("");
    setView(next);
  };
  const unavailable = (message = "هذه معاينة فقط؛ لن تُحفظ أي بيانات.") =>
    setNotice(online ? message : "أنت غير متصل. أعد الاتصال ثم حاول مرة أخرى.");
  const child = children[childIndex];
  return (
    <main className="app-shell">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      {!online && (
        <div className="offline-banner" role="alert">
          لا يوجد اتصال بالإنترنت. لا يمكن حفظ أو إرسال أي إجراء الآن.
        </div>
      )}
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => go("map")}
          aria-label="العودة إلى الخريطة"
        >
          <span className="brand-mark">✦</span>رِحلة الإسلام
        </button>
        <span className="preview-tag">نموذج تجريبي · لا تُحفظ البيانات</span>
        <div className="top-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="إعادة سماع الإرشاد"
            onClick={() => {
              void guideAudio.current?.play();
            }}
          >
            🔊
          </button>
          <button type="button" className="parent-link" onClick={() => go("parent")}>
            منطقة الوالد
          </button>
          <button
            type="button"
            className="avatar-button"
            onClick={() => setChild((childIndex + 1) % children.length)}
            aria-label="تبديل ملف الطفل"
          >
            <Image unoptimized src={asset(child.image)} alt="" width={44} height={44} />
          </button>
        </div>
      </header>
      <nav className="mobile-nav" aria-label="التنقل">
        <button
          type="button"
          className={view === "map" ? "selected" : ""}
          onClick={() => go("map")}
        >
          الخريطة
        </button>
        <button
          type="button"
          className={view === "lesson" ? "selected" : ""}
          onClick={() => go("lesson")}
        >
          الدرس
        </button>
        <button
          type="button"
          className={view === "parent" ? "selected" : ""}
          onClick={() => go("parent")}
        >
          الوالد
        </button>
      </nav>
      <section id="content" className="content" aria-live="polite">
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {view === "map" && (
          <WorldMap
            child={child}
            childIndex={childIndex}
            setChild={setChild}
            start={() => go("lesson")}
            unavailable={unavailable}
          />
        )}
        {view === "lesson" && <Lesson age={age} setAge={setAge} next={() => go("activity")} />}
        {view === "activity" && (
          <Activity answer={answer} setAnswer={setAnswer} finish={() => go("reward")} />
        )}
        {view === "reward" && <Reward map={() => go("map")} />}
        {view === "parent" && <Parent map={() => go("map")} unavailable={unavailable} />}
        {/* biome-ignore lint/a11y/useMediaCaption: interface narration has adjacent written text. */}
        <audio ref={guideAudio} src={asset("audio/guide/choose-world.mp3")} preload="none" />
      </section>
    </main>
  );
}

function WorldMap({
  child,
  childIndex,
  setChild,
  start,
  unavailable,
}: {
  child: (typeof children)[number];
  childIndex: number;
  setChild: (n: number) => void;
  start: () => void;
  unavailable: () => void;
}) {
  return (
    <>
      <section className="hero-card">
        <div>
          <p className="eyebrow">مرحبًا يا {child.name}!</p>
          <h1>خطوتك التالية تنتظرك</h1>
          <p>نتعلّم معًا قليلًا، ثم نلعب ونكسب النجوم.</p>
          <button type="button" className="primary-button" onClick={start}>
            لنبدأ <span>←</span>
          </button>
        </div>
        <Image
          unoptimized
          className="guide"
          src={asset("characters/guide.webp")}
          alt="المرشد يلوّح مرحّبًا"
          width={235}
          height={235}
        />
        <i className="cloud cloud-one" />
        <i className="cloud cloud-two" />
      </section>
      <section className="profile-row">
        <div>
          <p className="section-kicker">ملفات العائلة · معاينة</p>
          <h2>من سيبدأ الرحلة؟</h2>
        </div>
        <div className="profile-list">
          {children.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={`child-card ${index === childIndex ? "active" : ""}`}
              onClick={() => setChild(index)}
            >
              <Image unoptimized src={asset(item.image)} alt="" width={46} height={46} />
              <span>{item.name}</span>
              <small>{item.age}</small>
            </button>
          ))}
          <button type="button" className="add-child" onClick={unavailable}>
            ＋<span>إضافة طفل</span>
          </button>
        </div>
      </section>
      <section className="map-heading">
        <div>
          <p className="section-kicker">خريطة العوالم</p>
          <h2>إلى أين نذهب اليوم؟</h2>
        </div>
        <div className="star-count">
          <span>★</span> ٢ نجمتان
        </div>
      </section>
      <section className="world-grid">
        {worlds.map(([title, sub, image, state], index) => (
          <article key={title} className={`world-card ${state === "مقفل" ? "locked" : ""}`}>
            <Image unoptimized src={asset(image)} alt="" width={400} height={224} />
            <div className="world-overlay">
              <span className="world-number">٠{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{sub}</p>
              </div>
              <button
                type="button"
                disabled={state === "مقفل"}
                onClick={state === "ابدأ" ? start : unavailable}
              >
                {worldButtonLabel(state)}
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function Lesson({
  age,
  setAge,
  next,
}: {
  age: "6-7" | "8-10";
  setAge: (age: "6-7" | "8-10") => void;
  next: () => void;
}) {
  return (
    <section className="lesson-layout">
      <aside className="lesson-aside">
        <button type="button" className="back-button" onClick={() => history.back()}>
          → العودة للخريطة
        </button>
        <p className="section-kicker">عالم الإيمان · المرحلة ١ من ٥</p>
        <div className="progress-track">
          <span />
        </div>
        <p className="muted">أنهيت ١ من ٣ أجزاء</p>
        <div className="guide-note">
          <Image unoptimized src={asset("characters/guide.webp")} alt="" width={52} height={52} />
          <p>أنا مرشدك. يمكنك إعادة أي جزء في وقتك.</p>
        </div>
      </aside>
      <article className="lesson-card">
        <div className="draft-label">محتوى مسودة · غير منشور</div>
        <div className="lesson-top">
          <span>٧ دقائق</span>
          <span className="sound-button">🔇 صوت الدرس غير متاح</span>
        </div>
        <p className="eyebrow">درس اليوم</p>
        <h1>أركان الإيمان</h1>
        <p className="lesson-intro">
          الإيمان هو أن نؤمن بالله وملائكته وكتبه ورسله واليوم الآخر والقدر، خيره وشره.
        </p>
        <fieldset className="age-switch">
          <legend className="sr-only">نمط التعليمات</legend>
          <button
            type="button"
            className={age === "6-7" ? "selected" : ""}
            onClick={() => setAge("6-7")}
          >
            ٦–٧ سنوات
          </button>
          <button
            type="button"
            className={age === "8-10" ? "selected" : ""}
            onClick={() => setAge("8-10")}
          >
            ٨–١٠ سنوات
          </button>
        </fieldset>
        <div className="instruction">
          <span>💡</span>
          <p>
            {age === "6-7"
              ? "استمع إلى الجزء، ثم اختر الإجابة بالنقر. يمكنك سماع السؤال مرة أخرى."
              : "اقرأ الدرس، ثم أجب وفسّر إجابتك بمثال من الدرس."}
          </p>
        </div>
        <div className="faith-items">
          {["الله", "ملائكته", "كتبه", "رسله", "اليوم الآخر", "القدر"].map((item, index) => (
            <span key={item}>
              <b>{index + 1}</b>
              {item}
            </span>
          ))}
        </div>
        <button type="button" className="primary-button lesson-next" onClick={next}>
          انتقل إلى النشاط <span>←</span>
        </button>
      </article>
    </section>
  );
}

function Activity({
  answer,
  setAnswer,
  finish,
}: {
  answer: string | null;
  setAnswer: (n: string) => void;
  finish: () => void;
}) {
  const correct = answer === "٦";
  return (
    <section className="activity-layout">
      <div className="activity-progress">
        <span>النشاط ١ من ١</span>
        <div className="progress-track">
          <span />
        </div>
        <button type="button" aria-label="إعادة سماع السؤال">
          🔊
        </button>
      </div>
      <article className="activity-card">
        <div className="draft-label">سؤال تجريبي من مسودة المحتوى</div>
        <p className="eyebrow">لنثبت ما تعلّمناه</p>
        <h1>كم عدد أركان الإيمان؟</h1>
        <p>اختر الإجابة الصحيحة. لا تقلق، يمكنك المحاولة مرة أخرى.</p>
        <div className="answers">
          {["٥", "٦", "٧"].map((item) => (
            <button
              type="button"
              key={item}
              className={answerClass(answer, item, correct)}
              onClick={() => setAnswer(item)}
            >
              <span>{item}</span>
              {answer === item && (correct ? "✓" : "↻")}
            </button>
          ))}
        </div>
        {answer && (
          <div className={`feedback ${correct ? "good" : "retry"}`}>
            {correct ? "أحسنت! أركان الإيمان ستة." : "اقتربت! اقرأ البطاقات مرة أخرى ثم حاول."}
          </div>
        )}
        {correct && (
          <button type="button" className="primary-button" onClick={finish}>
            شاهد المكافأة <span>←</span>
          </button>
        )}
      </article>
    </section>
  );
}

function Reward({ map }: { map: () => void }) {
  return (
    <section className="reward-screen">
      <div className="sparkles">✦　★　✦</div>
      <div className="reward-stars">★ ★ ★</div>
      <p className="eyebrow">أحسنت!</p>
      <h1>أكملت المرحلة</h1>
      <p>تعرّفت إلى أركان الإيمان وأجبت عن سؤال النشاط.</p>
      <div className="reward-summary">
        <span>⭐ نجمة الدرس</span>
        <span>⭐⭐ نجمتا النشاط</span>
      </div>
      <div className="draft-warning">معاينة للمكافأة: لن تُضاف النجوم إلى أي حساب.</div>
      <button type="button" className="primary-button" onClick={map}>
        العودة إلى الخريطة <span>←</span>
      </button>
    </section>
  );
}

function Parent({
  map,
  unavailable,
}: {
  map: () => void;
  unavailable: (message?: string) => void;
}) {
  return (
    <section className="parent-screen">
      <div className="parent-header">
        <div>
          <button type="button" className="back-button" onClick={map}>
            → العودة
          </button>
          <p className="section-kicker">منطقة الوالد · معاينة فقط</p>
          <h1>مرحبًا، أم مريم</h1>
          <p>هذه بيانات عرض وليست حسابًا حقيقيًا أو منطقة محمية بـ PIN بعد.</p>
        </div>
        <button
          type="button"
          className="outline-button"
          onClick={() => unavailable("لن يتم تسجيل الخروج في النموذج التجريبي.")}
        >
          تسجيل الخروج
        </button>
      </div>
      <div className="parent-stats">
        <Stat value="٢" label="ملفات الأطفال" />
        <Stat value="٦" label="مراحل مكتملة" />
        <Stat value="١" label="بانتظار المراجعة" />
      </div>
      <div className="parent-grid">
        <article className="parent-card wide">
          <div className="card-title">
            <div>
              <p className="section-kicker">تقدّم مريم</p>
              <h2>عالم الإيمان</h2>
            </div>
            <span className="percent">٣٠٪</span>
          </div>
          <div className="big-progress">
            <span />
          </div>
          <p className="muted">٣ من ١٠ مراحل منشورة مطلوبة</p>
          <button
            type="button"
            className="text-button"
            onClick={() => unavailable("تفاصيل التقدم ستأتي من الحساب الحقيقي لاحقًا.")}
          >
            عرض التفاصيل ←
          </button>
        </article>
        <article className="parent-card">
          <p className="section-kicker">الحفظ</p>
          <h2>تسجيل ينتظر مراجعتك</h2>
          <div className="recording">
            <span>🎙</span>
            <div>
              <b>أركان الإيمان</b>
              <small>أرسله مريم — معاينة</small>
            </div>
          </div>
          <button
            type="button"
            className="outline-button"
            onClick={() => unavailable("لن يتم اعتماد التسجيل قبل اتصال الخادم.")}
          >
            استمع وراجع
          </button>
        </article>
        <article className="parent-card">
          <p className="section-kicker">التطبيق العملي</p>
          <h2>مهمة هذا الأسبوع</h2>
          <p>اذكر أركان الإيمان مع مريم باستخدام البطاقات.</p>
          <div className="task-state">◷ بانتظار تأكيد الوالد</div>
          <button
            type="button"
            className="outline-button"
            onClick={() => unavailable("تأكيد التطبيق معروض للمعاينة فقط.")}
          >
            تأكيد التطبيق
          </button>
        </article>
      </div>
      <section className="account-preview">
        <div>
          <h2>حساب الأسرة</h2>
          <p>إنشاء الحساب، البريد، كلمة المرور وPIN ليست متصلة في هذا النموذج.</p>
        </div>
        <button
          type="button"
          className="outline-button"
          onClick={() => unavailable("لن يُنشأ حساب أو تُرسل بيانات من النموذج التجريبي.")}
        >
          إدارة الحساب
        </button>
      </section>
    </section>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function worldButtonLabel(state: string) {
  if (state === "مقفل") {
    return "🔒 مقفل";
  }
  if (state === "ابدأ") {
    return "ابدأ ←";
  }
  return state;
}

function answerClass(answer: string | null, item: string, correct: boolean) {
  if (answer !== item) {
    return "";
  }
  return correct ? "correct" : "wrong";
}
