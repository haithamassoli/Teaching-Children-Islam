"use client";

import { useEffect, useRef, useState } from "react";
import Recorder from "./recorder";

export type MemoryItem = {
  id: string;
  title: string;
  text?: string;
  audioAsset?: string;
  status: string;
};

const statuses: Record<string, string> = {
  not_started: "لم يبدأ",
  practicing: "قيد التدريب",
  training: "قيد التدريب",
  pending: "بانتظار المراجعة",
  awaiting_review: "بانتظار المراجعة",
  approved: "أتقنها",
  mastered: "أتقنها",
  retry: "يحتاج مراجعة",
  needs_review: "يحتاج مراجعة",
};

export default function Memorization({
  items,
  consent,
  train,
  requestReview,
  upload,
}: {
  items: MemoryItem[];
  consent: boolean;
  train: (itemId: string) => Promise<unknown>;
  requestReview: (itemId: string) => Promise<unknown>;
  upload: (itemId: string, blob: Blob, durationMs: number) => Promise<void>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selected, setSelected] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const item = items.find((entry) => entry.id === selected) ?? items[0];

  useEffect(() => {
    if (!item?.id || !item.audioAsset) {
      return;
    }
    const player = audioRef.current;
    return () => player?.pause();
  }, [item?.id, item?.audioAsset]);

  async function practice(request = false) {
    if (!item || busy) {
      return;
    }
    if (!navigator.onLine) {
      setNotice("لا يوجد اتصال؛ أعد المحاولة عند عودته.");
      return;
    }
    setBusy(true);
    try {
      await (request ? requestReview(item.id) : train(item.id));
      setNotice(
        request
          ? "وصل طلب التسميع المباشر إلى الوالد."
          : "حفظنا أنك تتدرّب. يمكنك التسميع للوالد عندما تستعد.",
      );
    } catch {
      setNotice("لم نتمكن من تأكيد حفظ التدريب. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-card">
      <h2>حفظي ومراجعتي</h2>
      {item ? (
        <>
          <label>
            اختر ما تتدرّب عليه
            <select
              value={item.id}
              onChange={(event) => {
                setSelected(event.target.value);
                setNotice("");
              }}
            >
              {items.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
          </label>
          <h3>{item.title}</h3>
          <p>{statuses[item.status] ?? "لم يبدأ"}</p>
          {item.text && <p className="memory-text">{item.text}</p>}
          {item.audioAsset ? (
            <>
              {/* biome-ignore lint/a11y/useMediaCaption: The approved recitation text is rendered directly above the player. */}
              <audio
                ref={audioRef}
                key={item.id}
                src={item.audioAsset}
                controls
                loop={repeat}
                preload="none"
                aria-label={`الاستماع إلى ${item.title}`}
                onPlay={(event) => {
                  const current = event.currentTarget;
                  document.querySelectorAll("audio").forEach((audio) => {
                    if (audio !== current) {
                      audio.pause();
                    }
                  });
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={repeat}
                  onChange={(event) => setRepeat(event.target.checked)}
                />
                كرّر المقطع
              </label>
            </>
          ) : (
            <p>التلاوة غير متاحة لهذا العنصر بعد؛ يمكنك التسميع المباشر للوالد.</p>
          )}
          <button
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={() => practice()}
          >
            أتدرّب على الحفظ
          </button>
          <button
            type="button"
            className="outline-button"
            disabled={busy}
            onClick={() => practice(true)}
          >
            أطلب التسميع المباشر للوالد
          </button>
          <Recorder
            key={item.id}
            consent={consent}
            upload={(blob, durationMs) => upload(item.id, blob, durationMs)}
          />
          <p role="status">{notice}</p>
        </>
      ) : (
        <p>لا عناصر حفظ معتمدة بعد.</p>
      )}
    </section>
  );
}
