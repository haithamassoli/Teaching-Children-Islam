"use client";
import { useAuthToken } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import ParentProgress from "./parent-progress";

export default function ReviewPanel({ parentToken }: { parentToken: string }) {
  const dashboard = useAction(api.review.dashboard);
  const decide = useAction(api.review.decide);
  const removeRecording = useAction(api.review.removeRecording);
  const setConsent = useAction(api.review.setRecordingConsent);
  const token = useAuthToken();
  const [data, setData] = useState<Awaited<ReturnType<typeof dashboard>> | null>(null);
  const [notice, setNotice] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const refresh = useCallback(async () => {
    setNotice("");
    setData(await dashboard({ parentToken }));
  }, [dashboard, parentToken]);
  useEffect(() => {
    void refresh().catch(() => setNotice("تعذر تحميل متابعة الوالد."));
  }, [refresh]);
  useEffect(
    () => () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    },
    [audioUrl],
  );
  const act = async (task: () => Promise<unknown>) => {
    try {
      await task();
      await refresh();
      setNotice("تم تأكيد العملية.");
    } catch {
      setNotice("تعذر تأكيد العملية. تحقق من الاتصال وجلسة الوالد.");
    }
  };
  return (
    <section className="children-live">
      <button
        type="button"
        className="outline-button"
        onClick={() => void refresh().catch(() => setNotice("تعذر تحميل متابعة الوالد."))}
      >
        تحديث متابعة الوالد
      </button>
      {notice && <p role="status">{notice}</p>}
      {audioUrl && (
        /* biome-ignore lint/a11y/useMediaCaption: the parent review title and feedback provide the transcription context. */
        <audio
          src={audioUrl}
          controls
          autoPlay
          onEnded={() => {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl("");
          }}
        />
      )}
      {data?.map((entry) => (
        <section key={entry.child._id}>
          <h2>{entry.child.name}</h2>
          <button
            type="button"
            className="outline-button"
            onClick={() =>
              void act(() =>
                setConsent({
                  childId: entry.child._id,
                  allowed: !entry.child.recordingConsentAt,
                  parentToken,
                }),
              )
            }
          >
            {entry.child.recordingConsentAt ? "إيقاف إذن التسجيل" : "السماح بالتسجيل"}
          </button>
          <ParentProgress
            summary={entry.summary}
            reviews={entry.reviews.map((item) => ({
              ...item,
              recordingId: item.recordingId ? String(item.recordingId) : undefined,
              status: "pending",
            }))}
            review={(item, approved, message) =>
              act(() =>
                decide({ reviewId: item.id as Id<"reviews">, approved, message, parentToken }),
              )
            }
            listen={async (recordingId) => {
              if (!token) {
                throw new Error("UNAUTHENTICATED");
              }
              const site = recordingSite();
              const response = await fetch(
                `${site}/recording?id=${encodeURIComponent(recordingId)}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              if (!response.ok) {
                throw new Error("DOWNLOAD_FAILED");
              }
              if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
              }
              setAudioUrl(URL.createObjectURL(await response.blob()));
            }}
            removeRecording={(id) =>
              act(() => removeRecording({ recordingId: id as Id<"recordings">, parentToken }))
            }
          />
        </section>
      ))}
    </section>
  );
}

function recordingSite() {
  const configured = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (configured) {
    return configured;
  }
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloud) {
    throw new Error("CONVEX_SITE_URL_MISSING");
  }
  return cloud.replace(".convex.cloud", ".convex.site");
}
