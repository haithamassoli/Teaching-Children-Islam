import type { Metadata } from "next";
import { arabicNumber } from "../../lib/assets";
import { numberInRange } from "../../lib/quran";
import { JourneyFooter, JourneyHeader } from "../components/journey-ui";
import styles from "./quran.module.css";
import QuranReader, { type QuranVerse } from "./quran-reader";

export const metadata: Metadata = {
  title: "القرآن الكريم",
  description: "مصحف للأطفال مع تلاوة الشيخ محمود خليل الحصري وخاصية تكرار الآيات.",
};

type Chapter = {
  id: number;
  name_arabic: string;
  verses_count: number;
};

const api = "https://api.quran.com/api/v4";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${api}${path}`, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Quran API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export default async function QuranPage({
  searchParams,
}: {
  searchParams: Promise<{ surah?: string; ayah?: string }>;
}) {
  const params = await searchParams;
  const chapterNumber = numberInRange(params.surah, 1, 114);
  const [{ chapters }, { verses }, { audio_files: audioFiles }] = await Promise.all([
    getJson<{ chapters: Chapter[] }>("/chapters?language=ar"),
    getJson<{ verses: Array<{ verse_key: string; text_qpc_hafs: string }> }>(
      `/quran/verses/qpc_hafs?chapter_number=${chapterNumber}`,
    ),
    getJson<{ audio_files: Array<{ verse_key: string; url: string }> }>(
      `/recitations/12/by_chapter/${chapterNumber}`,
    ),
  ]);
  const chapter = chapters.find((item) => item.id === chapterNumber);
  if (!chapter || !verses.length) {
    throw new Error("Quran chapter data is unavailable");
  }
  const audioByVerse = new Map(audioFiles.map((file) => [file.verse_key, file.url]));
  const readerVerses: QuranVerse[] = verses.map((verse) => {
    const audioUrl = audioByVerse.get(verse.verse_key);
    return {
      ...verse,
      audioUrl: audioUrl?.startsWith("//") ? `https:${audioUrl}` : audioUrl,
    };
  });
  const initialAyah = numberInRange(params.ayah, 1, chapter.verses_count);

  return (
    <div className="journey-site" id="quran-page">
      <a className="skip-link" href="#content">
        انتقل إلى المحتوى
      </a>
      <JourneyHeader active="quran" />
      <main className={`journey-main ${styles.main}`} id="content">
        <section className={styles.hero}>
          <div>
            <p className="section-kicker">نقرأ · نستمع · نكرّر</p>
            <h1>القرآن الكريم</h1>
            <p>اختر سورة، واستمع إلى الحصري المعلّم، وكرّر كل آية حتى يثبت حفظها.</p>
          </div>
          <div className={styles.heroMark} aria-hidden="true">
            ۞
          </div>
        </section>

        <form className={styles.chapterPicker} action="/quran">
          <label htmlFor="surah">اختر السورة</label>
          <select id="surah" name="surah" defaultValue={chapterNumber}>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {arabicNumber(item.id)}. {item.name_arabic} · {arabicNumber(item.verses_count)} آية
              </option>
            ))}
          </select>
          <button type="submit">افتح السورة</button>
        </form>

        <QuranReader
          key={chapter.id}
          chapterName={chapter.name_arabic}
          initialAyah={initialAyah}
          verses={readerVerses}
        />
      </main>
      <JourneyFooter />
    </div>
  );
}
