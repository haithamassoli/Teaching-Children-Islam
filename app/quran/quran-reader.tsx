"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { arabicNumber, assetUrl } from "../../lib/assets";
import { nextPlayback } from "../../lib/quran";
import styles from "./quran.module.css";

export type QuranVerse = {
  verse_key: string;
  text_qpc_hafs: string;
  audioUrl?: string;
};

export default function QuranReader({
  chapterName,
  initialAyah,
  verses,
}: {
  chapterName: string;
  initialAyah: number;
  verses: QuranVerse[];
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const verseIndex = useRef(Math.min(initialAyah - 1, verses.length - 1));
  const pass = useRef(1);
  const playFollowing = useRef(false);
  const [active, setActive] = useState(verseIndex.current);
  const [repeat, setRepeat] = useState(3);
  const [currentPass, setCurrentPass] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("اختر آية أو ابدأ السورة من موضعك.");

  function play(index: number, continuous: boolean) {
    const player = audio.current;
    const verse = verses[index];
    if (!player || !verse?.audioUrl) {
      setNotice("تلاوة هذه الآية غير متاحة الآن.");
      return;
    }
    verseIndex.current = index;
    pass.current = 1;
    playFollowing.current = continuous;
    setActive(index);
    setCurrentPass(1);
    setNotice(continuous ? "سنكرّر كل آية ثم ننتقل إلى التالية." : "استمع وردّد على مهل.");
    player.src = verse.audioUrl;
    void player.play().catch(() => setNotice("تعذّر تشغيل التلاوة. تحقق من الاتصال ثم حاول مجددًا."));
  }

  function continuePlayback() {
    const player = audio.current;
    if (!player) {
      return;
    }
    const next = nextPlayback(
      verseIndex.current,
      pass.current,
      repeat,
      verses.length,
      playFollowing.current,
    );
    if (!next) {
      setPlaying(false);
      setNotice("أحسنت! اكتمل التكرار.");
      return;
    }
    pass.current = next.pass;
    setCurrentPass(next.pass);
    if (next.verseIndex === verseIndex.current) {
      player.currentTime = 0;
      void player
        .play()
        .catch(() => setNotice("تعذّر إكمال التكرار. تحقق من الاتصال ثم حاول مجددًا."));
      return;
    }
    play(next.verseIndex, true);
  }

  return (
    <>
      <section className={styles.practice} aria-label="مشغّل الحفظ">
        <div className={styles.reciter}>
          <span>القارئ</span>
          <strong>الشيخ محمود خليل الحصري</strong>
          <small>رواية حفص · تلاوة المعلّم</small>
        </div>
        <label className={styles.repeatPicker}>
          تكرار كل آية
          <select
            value={repeat}
            onChange={(event) => {
              const value = Number(event.target.value);
              pass.current = 1;
              setCurrentPass(1);
              setRepeat(value);
            }}
          >
            {[1, 3, 5, 10].map((count) => (
              <option key={count} value={count}>
                {arabicNumber(count)} {count === 1 ? "مرة" : "مرات"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.startButton}
          disabled={!verses[active]?.audioUrl}
          onClick={() => play(active, true)}
        >
          <Image unoptimized src={assetUrl("icons/play.svg")} alt="" width={24} height={24} />
          ابدأ من الآية {arabicNumber(active + 1)}
        </button>
        {/* biome-ignore lint/a11y/useMediaCaption: The matching Quran verse is visible and highlighted below. */}
        <audio
          ref={audio}
          controls
          preload="none"
          aria-label={`تلاوة سورة ${chapterName} بصوت الشيخ الحصري`}
          onEnded={continuePlayback}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <p className={styles.status} role="status">
          {playing
            ? `الآية ${arabicNumber(active + 1)} · المرة ${arabicNumber(currentPass)} من ${arabicNumber(repeat)}`
            : notice}
        </p>
      </section>

      <section className={styles.chapter} aria-labelledby="chapter-title">
        <header>
          <span>سورة</span>
          <h2 id="chapter-title">{chapterName}</h2>
          <small>{arabicNumber(verses.length)} آية</small>
        </header>
        <div className={styles.verses}>
          {verses.map((verse, index) => (
            <article
              className={index === active ? styles.activeVerse : undefined}
              id={`ayah-${index + 1}`}
              key={verse.verse_key}
            >
              <button
                type="button"
                aria-label={`استمع إلى الآية ${arabicNumber(index + 1)}`}
                aria-pressed={index === active}
                disabled={!verse.audioUrl}
                onClick={() => play(index, false)}
              >
                <Image
                  unoptimized
                  src={assetUrl(
                    index === active && playing ? "icons/repeat.svg" : "icons/play.svg",
                  )}
                  alt=""
                  width={22}
                  height={22}
                />
              </button>
              <p className={styles.quranText}>{verse.text_qpc_hafs}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
