"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import Activity, { type ActivityAnswer, type ActivityQuestion } from "./activity";
import Memorization from "./memorization";

export default function LearningJourney({
  childId,
  age,
  onBack,
}: {
  childId: Id<"children">;
  age: number;
  onBack: () => void;
}) {
  const [lessonId, setLessonId] = useState<string | null>(null);
  const map = useQuery(api.learning.map, { childId });
  const lesson = useQuery(api.learning.lesson, lessonId ? { childId, lessonId } : "skip");
  const completeSegment = useMutation(api.learning.completeSegment);
  const submitActivity = useMutation(api.learning.submitActivity);
  const items = useQuery(api.review.items, { childId });
  const train = useMutation(api.review.markTraining);
  const requestReview = useMutation(api.review.requestLiveReview);
  const token = useAuthToken();
  const [message, setMessage] = useState("");
  const [savingSegment, setSavingSegment] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const play = (path: string | null) => {
    if (!path || !audio.current) {
      return;
    }
    audio.current.pause();
    audio.current.src = `/api/assets/${path}`;
    void audio.current.play().catch(() => setMessage("تعذر تشغيل الصوت. حاول مرة أخرى."));
  };

  if (!map) {
    return (
      <main className="family-shell">
        <p>يُحمّل مسار التعلّم…</p>
      </main>
    );
  }
  if (!lessonId) {
    return (
      <main className="family-shell">
        <header className="family-header">
          <div>
            <p className="section-kicker">رحلة {map.child.name}</p>
            <h1>خريطة العوالم</h1>
          </div>
          <button type="button" className="outline-button" onClick={onBack}>
            تغيير الطفل
          </button>
        </header>
        <p className="star-count">★ {map.stars} نجوم</p>
        {/* biome-ignore lint/a11y/useMediaCaption: each recorded instruction has adjacent written lesson text. */}
        <audio ref={audio} preload="none" />
        {map.badges.length > 0 && <p className="badge-row">الشارات: {map.badges.join(" · ")}</p>}
        <section className="learning-worlds">
          {map.worlds.map((world) => (
            <article key={world.id} className="learning-world-card">
              <h2>{world.title}</h2>
              <p>
                {world.total ? `${world.completed} من ${world.total} مراحل` : "لا محتوى معتمد بعد"}
              </p>
              <ol className="stage-list">
                {world.stages.map((stage) => (
                  <li key={stage.id}>
                    <button
                      type="button"
                      disabled={!stage.unlocked}
                      onClick={() => setLessonId(stage.id)}
                    >
                      {stageLabel(stage)} {stage.title}
                    </button>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>
      </main>
    );
  }
  if (!lesson) {
    return (
      <main className="family-shell">
        <p>يُحمّل الدرس…</p>
      </main>
    );
  }
  const pending = lesson.segments.filter(
    (segment) => !lesson.state.completedSegments.includes(segment.id),
  );
  return (
    <main className="family-shell">
      <button type="button" className="back-button" onClick={() => setLessonId(null)}>
        → الخريطة
      </button>
      <section className="account-card">
        <p className="section-kicker">درس معتمد</p>
        <h1>{lesson.title}</h1>
        <p>{lesson.objective}</p>
        <p>{lesson.ageInstructions[age < 8 ? "6-7" : "8-10"]}</p>
        {/* biome-ignore lint/a11y/useMediaCaption: each recorded instruction has adjacent written lesson text. */}
        <audio ref={audio} preload="none" />
        {lesson.segments.map((segment) => (
          <article key={segment.id} className="lesson-segment">
            <p>{segment.text}</p>
            {segment.image_asset && (
              <Image
                unoptimized
                src={`/api/assets/${segment.image_asset}`}
                alt=""
                width={640}
                height={360}
              />
            )}
            {segment.audio_asset && (
              <button
                type="button"
                className="sound-button"
                onClick={() => play(segment.audio_asset)}
              >
                🔊 استمع
              </button>
            )}
            {lesson.state.completedSegments.includes(segment.id) ? (
              <span>✓ اكتمل</span>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={savingSegment === segment.id}
                onClick={async () => {
                  if (!navigator.onLine) {
                    setMessage("لا يوجد اتصال. أعد المحاولة عند عودة الإنترنت.");
                    return;
                  }
                  setSavingSegment(segment.id);
                  try {
                    await completeSegment({ childId, lessonId, segmentId: segment.id });
                  } catch {
                    setMessage("لم يُحفظ الإكمال. أعد المحاولة.");
                  } finally {
                    setSavingSegment(null);
                  }
                }}
              >
                أكملت هذا الجزء
              </button>
            )}
          </article>
        ))}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </section>
      {pending.length === 0 &&
        lesson.questions.map((question) => (
          <Activity
            key={question.id}
            question={
              { ...question, age_instructions: question.ageInstructions } as ActivityQuestion
            }
            age={age}
            submit={(answer: ActivityAnswer) =>
              submitActivity({
                childId,
                lessonId,
                questionId: question.id,
                answer,
              })
            }
          />
        ))}
      {lesson.state.lessonCompleted && lesson.state.activityPassed && (
        <section className="reward-screen">
          <h2>أحسنت!</h2>
          <p>جمعت نجوم هذه المرحلة. أحسنت المحاولة والتعلّم!</p>
          <button type="button" className="primary-button" onClick={() => setLessonId(null)}>
            عودة للخريطة
          </button>
        </section>
      )}
      {items && (
        <Memorization
          items={items.memorization.map((item) => ({
            ...item,
            audioAsset: item.audioAsset ? `/api/assets/${item.audioAsset}` : undefined,
          }))}
          consent={items.consent}
          train={(itemId) => train({ childId, itemId, kind: "memorization" })}
          upload={async (itemId, blob) => {
            if (!token) {
              throw new Error("UNAUTHENTICATED");
            }
            const site = recordingSite();
            const response = await fetch(
              `${site}/recordings?childId=${childId}&itemId=${encodeURIComponent(itemId)}`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "audio/wav" },
                body: blob,
              },
            );
            if (!response.ok) {
              throw new Error("UPLOAD_FAILED");
            }
          }}
        />
      )}
      {items && (
        <section className="account-card">
          <h2>التطبيق مع الوالد</h2>
          {items.practice.map((item) => (
            <article key={item.id}>
              <p>{item.instruction}</p>
              <p>{item.status}</p>
              <button
                type="button"
                className="outline-button"
                onClick={() => train({ childId, itemId: item.id, kind: "practice" })}
              >
                تدرّبت
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => requestReview({ childId, itemId: item.id, kind: "practice" })}
              >
                أطلب تأكيد الوالد
              </button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function stageLabel(stage: { completed: boolean; unlocked: boolean }) {
  if (stage.completed) {
    return "↻";
  }
  if (stage.unlocked) {
    return "ابدأ";
  }
  return "🔒";
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
