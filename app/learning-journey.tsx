"use client";

import { useMutation, useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { arabicNumber, worldArt } from "../lib/assets";
import Activity, { type ActivityAnswer, type ActivityQuestion } from "./activity";
import ChildReview from "./child-review";
import { Asset } from "./components/journey-ui";

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
  const [message, setMessage] = useState("");
  const [savingSegment, setSavingSegment] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (!lessonId) {
      return;
    }
    const player = audio.current;
    return () => player?.pause();
  }, [lessonId]);
  const play = (path: string | null) => {
    if (!path || !audio.current) {
      return;
    }
    document.querySelectorAll("audio").forEach((player) => {
      player.pause();
    });
    audio.current.src = `/api/assets/${path.replace(/^assets\//, "")}`;
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
        <p className="star-count">★ {arabicNumber(map.stars)} نجوم</p>
        {/* biome-ignore lint/a11y/useMediaCaption: each recorded instruction has adjacent written lesson text. */}
        <audio ref={audio} preload="none" />
        {map.badges.length > 0 && (
          <div className="badge-row">
            {map.badges.map((badge) => (
              <Asset
                key={badge}
                path={`fantasy/badges/${worldArt(badge.replace("world:", ""))}-earned.svg`}
                width={72}
                alt={`شارة عالم ${map.worlds.find((world) => `world:${world.id}` === badge)?.title ?? "التعلّم"}`}
              />
            ))}
          </div>
        )}
        <section className="learning-worlds">
          {map.worlds.map((world) => (
            <article key={world.id} className="learning-world-card">
              <Asset
                path={`fantasy/worlds/${worldArt(world.id)}.svg`}
                width={480}
                height={240}
                className="live-world-image"
              />
              <h2>{world.title}</h2>
              <p>
                {world.total ? `${world.completed} من ${world.total} مراحل` : "لا محتوى معتمد بعد"}
              </p>
              <details>
                <summary>استكشف المراحل</summary>
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
              </details>
            </article>
          ))}
        </section>
        <ChildReview childId={childId} />
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
        <Asset
          path={`fantasy/worlds/${worldArt(lesson.worldId)}.svg`}
          width={920}
          height={240}
          className="live-lesson-image"
        />
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
                src={`/api/assets/${segment.image_asset.replace(/^assets\//, "")}`}
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
                answer:
                  typeof answer === "object" && !Array.isArray(answer)
                    ? JSON.stringify(answer)
                    : answer,
              })
            }
          />
        ))}
      {lesson.state.lessonCompleted &&
        (lesson.state.activityPassed ||
          !lesson.questions.some(
            (question) => !["short_answer", "parent_discussion"].includes(question.type),
          )) && (
          <section className="reward-screen">
            <Asset
              path={`fantasy/rewards/stars-${lesson.state.activityPassed ? 3 : 1}.svg`}
              width={225}
              height={76}
            />
            <h2>أحسنت!</h2>
            <p>أكملت الدرس! ناقش إجاباتك مع الوالد، ثم واصل رحلتك.</p>
            <button type="button" className="primary-button" onClick={() => setLessonId(null)}>
              عودة للخريطة
            </button>
          </section>
        )}
      <ChildReview childId={childId} />
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
