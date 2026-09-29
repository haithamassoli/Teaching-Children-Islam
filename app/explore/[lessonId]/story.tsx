"use client";

import { useState } from "react";
import { arabicNumber } from "../../../lib/assets";
import { Buddy, playEffect } from "../../components/buddy";
import { ReadAloud } from "../../narration";

type Segment = { id: string; text: string };

export default function LessonStory({ segments }: { segments: Segment[] }) {
  const [step, setStep] = useState(0);
  const [all, setAll] = useState(false);
  const last = segments.length - 1;
  const go = (next: number) => {
    playEffect("page-turn");
    setStep(next);
  };

  if (all || segments.length < 2) {
    return (
      <>
        {segments.map((segment, index) => (
          <div key={segment.id} className="reading-segment" data-narration={segment.text}>
            <small>الجزء {arabicNumber(index + 1)}</small>
            <p>{segment.text}</p>
            <ReadAloud />
          </div>
        ))}
        {segments.length > 1 && (
          <button type="button" className="text-button" onClick={() => setAll(false)}>
            اقرأ جزءًا جزءًا مع رفيقك
          </button>
        )}
      </>
    );
  }

  const segment = segments[step];
  return (
    <div className="story-stepper">
      <nav className="story-dots" aria-label="أجزاء القصة">
        {segments.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-label={`الجزء ${arabicNumber(index + 1)}`}
            aria-current={index === step ? "step" : undefined}
            data-done={index < step || undefined}
            onClick={() => go(index)}
          />
        ))}
      </nav>
      <div className="story-scene">
        <Buddy size={112} say="" mood={step === last ? "happy" : "idle"} />
        <div key={segment.id} className="reading-segment story-page" data-narration={segment.text}>
          <small>
            الجزء {arabicNumber(step + 1)} من {arabicNumber(segments.length)}
          </small>
          <p>{segment.text}</p>
          <ReadAloud />
        </div>
      </div>
      <div className="story-controls">
        <button
          type="button"
          className="outline-button"
          disabled={step === 0}
          onClick={() => go(step - 1)}
        >
          <span aria-hidden="true">→</span> السابق
        </button>
        {step < last ? (
          <button type="button" className="primary-button" onClick={() => go(step + 1)}>
            التالي <span aria-hidden="true">←</span>
          </button>
        ) : (
          <a className="primary-button" href="#practice">
            أنهيتُ القراءة، هيا نلعب! <span aria-hidden="true">←</span>
          </a>
        )}
      </div>
      <button type="button" className="text-button story-all" onClick={() => setAll(true)}>
        عرض كل الأجزاء معًا
      </button>
    </div>
  );
}
