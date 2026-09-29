"use client";

import { type CSSProperties, useState } from "react";
import { Buddy, type Mood, playEffect } from "./components/buddy";
import { ReadAloud } from "./narration";

export type ActivityQuestion = {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  items?: string[];
  left?: string[];
  right?: string[];
  age_instructions?: Record<string, string>;
};
export type ActivityAnswer = string | string[] | Record<string, string>;
type Result = "correct" | "retry" | "open" | "error";

const reactions: Record<Result, { mood: Mood; icon: string; title: string }> = {
  correct: { mood: "happy", icon: "✓", title: "أحسنت! إجابة صحيحة" },
  retry: { mood: "oops", icon: "↺", title: "قريب! لنحاول مرة أخرى" },
  open: { mood: "happy", icon: "📖", title: "هذا جواب الكتاب" },
  error: { mood: "thinking", icon: "!", title: "لم يصل جوابك" },
};

export default function Activity({
  question,
  age,
  submit,
}: {
  question: ActivityQuestion;
  age: number;
  submit: (answer: ActivityAnswer) => Promise<{ correct: boolean | null; explanation: string }>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [value, setValue] = useState("");
  const [writing, setWriting] = useState(age >= 8);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const passed = result === "correct" || result === "open";
  const ordered = ["ordering", "verse_order"].includes(question.type);
  const matching = ["matching", "source_reference_match"].includes(question.type);
  const choice = ["multiple_choice", "multiple_select", "story_choice"].includes(question.type);
  // Open questions are discussed with the parent, so young children can answer out loud.
  const spoken = ["short_answer", "parent_discussion"].includes(question.type);
  const written = spoken || question.type === "numeric";
  const hint = question.age_instructions?.[age < 8 ? "6-7" : "8-10"];
  let canSubmit = ordered ? selected.length === question.items?.length : Boolean(value.trim());
  if (matching) {
    canSubmit = Boolean(question.left?.length && question.left.every((item) => pairs[item]));
  } else if (question.type === "multiple_select") {
    canSubmit = selected.length > 0;
  } else if (spoken) {
    canSubmit = true;
  }

  function reset() {
    setFeedback("");
    setResult(null);
  }

  async function check() {
    if (busy || passed || !canSubmit) {
      return;
    }
    if (!navigator.onLine) {
      setResult("error");
      setFeedback("لا يوجد اتصال. أعد المحاولة عند عودة الإنترنت.");
      return;
    }
    let answer: ActivityAnswer = value.trim();
    if (ordered || question.type === "multiple_select") {
      answer = selected;
    } else if (matching) {
      answer = pairs;
    }
    setBusy(true);
    reset();
    try {
      const outcome = await submit(answer);
      if (outcome.correct === null) {
        setResult("open");
        setFeedback(outcome.explanation);
      } else if (outcome.correct) {
        setResult("correct");
        setFeedback(outcome.explanation);
        playEffect("soft-pop");
      } else {
        setResult("retry");
        setFeedback(outcome.explanation);
      }
    } catch {
      setResult("error");
      setFeedback("لم تُحفظ الإجابة. احتفظنا باختيارك؛ أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(item: string) {
    setSelected((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item],
    );
    reset();
  }

  if (!ordered && !matching && !choice && !written) {
    return <p role="alert">هذا النشاط غير متاح بعد. عُد إلى الخريطة.</p>;
  }

  const reaction = result ? reactions[result] : null;
  return (
    <section
      className="account-card activity-card"
      data-result={result ?? undefined}
      aria-label={`نشاط الفهم: ${question.prompt}`}
      data-narration={[
        question.prompt,
        hint,
        ...(question.options ?? question.items ?? []),
        ...(question.left ?? []),
        ...(question.right ?? []),
        feedback,
      ]
        .filter(Boolean)
        .join(". ")}
    >
      <div className="activity-question">
        <h2>{question.prompt}</h2>
        <ReadAloud />
      </div>
      {hint && <p className="activity-hint">{hint}</p>}
      <fieldset disabled={busy || passed}>
        <legend className="sr-only">إجابتك</legend>
        {choice && (
          <div className="choice-grid">
            {question.options?.map((option) => {
              const picked =
                question.type === "multiple_select" ? selected.includes(option) : value === option;
              return (
                <button
                  key={option}
                  type="button"
                  className="choice-card"
                  aria-pressed={picked}
                  onClick={() => {
                    playEffect("tap");
                    if (question.type === "multiple_select") {
                      toggle(option);
                    } else {
                      setValue(option);
                      reset();
                    }
                  }}
                >
                  <span className="choice-mark" aria-hidden="true">
                    {picked ? "✓" : ""}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        )}
        {ordered && (
          <OrderBoard
            items={question.items ?? []}
            selected={selected}
            toggle={toggle}
            clear={() => {
              setSelected([]);
              reset();
            }}
          />
        )}
        {matching &&
          question.left?.map((item) => (
            <fieldset key={item} className="match-row">
              <legend>{item}</legend>
              <div className="match-options">
                {question.right?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="choice-chip"
                    aria-pressed={pairs[item] === option}
                    onClick={() => {
                      playEffect("tap");
                      setPairs((current) => ({ ...current, [item]: option }));
                      reset();
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        {written && !(passed && !value) && (
          <WrittenAnswer
            numeric={question.type === "numeric"}
            writing={writing || !spoken}
            startWriting={() => setWriting(true)}
            value={value}
            setValue={(next) => {
              setValue(next);
              reset();
            }}
          />
        )}
      </fieldset>
      {!passed && (
        <button
          className="primary-button activity-submit"
          type="button"
          disabled={busy || !canSubmit}
          onClick={check}
        >
          {submitLabel(busy, spoken && !value.trim())}
        </button>
      )}
      <div role="status" aria-live="polite" className="activity-feedback">
        {reaction && (
          <>
            {result === "correct" && <StarBurst />}
            <p className="feedback-title">
              <span aria-hidden="true">{reaction.icon}</span> {reaction.title}
            </p>
            <Buddy size={84} mood={reaction.mood} say={feedback} />
            {result === "open" && (
              <p className="feedback-note">ناقش هذه الإجابة مع الوالد، وقارن بها ما قلته.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function submitLabel(busy: boolean, spokenOnly: boolean) {
  if (busy) {
    return "جارٍ التحقق…";
  }
  return spokenOnly ? "🎤 قلتُ جوابي، أرِني جواب الكتاب" : "تحقق من إجابتي";
}

function OrderBoard({
  items,
  selected,
  toggle,
  clear,
}: {
  items: string[];
  selected: string[];
  toggle: (item: string) => void;
  clear: () => void;
}) {
  return (
    <>
      <p className="activity-hint">
        اضغط على البطاقات بالترتيب الصحيح. للتراجع اضغط البطاقة مرة أخرى.
      </p>
      <div className="choice-grid">
        {items.map((item) => {
          const place = selected.indexOf(item);
          return (
            <button
              type="button"
              key={item}
              className="choice-card"
              aria-pressed={place >= 0}
              onClick={() => {
                playEffect("tap");
                toggle(item);
              }}
            >
              <span className="choice-mark" aria-hidden="true">
                {place >= 0 ? (place + 1).toLocaleString("ar-u-nu-arab") : ""}
              </span>
              {item}
            </button>
          );
        })}
      </div>
      <ol aria-label="الترتيب الذي اخترته" className="sr-only">
        {selected.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      {selected.length > 0 && (
        <button type="button" className="text-button" onClick={clear}>
          ↺ إعادة الترتيب
        </button>
      )}
    </>
  );
}

function WrittenAnswer({
  numeric,
  writing,
  startWriting,
  value,
  setValue,
}: {
  numeric: boolean;
  writing: boolean;
  startWriting: () => void;
  value: string;
  setValue: (value: string) => void;
}) {
  if (!writing) {
    return (
      <div className="say-aloud">
        <p>
          <span aria-hidden="true">🗣️</span> فكّر قليلًا، ثم قل جوابك بصوتك لمن معك.
        </p>
        <button type="button" className="text-button" onClick={startWriting}>
          ✏️ أفضّل أن أكتب
        </button>
      </div>
    );
  }
  return (
    <label className="written-answer">
      {numeric ? "اكتب العدد" : "اكتب جوابك (اختياري) ليراجعه الوالد"}
      <input
        type="text"
        inputMode={numeric ? "decimal" : "text"}
        value={value}
        maxLength={2000}
        onChange={(event) => setValue(event.target.value)}
      />
    </label>
  );
}

function StarBurst() {
  return (
    <span className="star-burst" aria-hidden="true">
      {["✦", "★", "✧", "★", "✦", "✧", "★", "✦"].map((star, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static decorative stars.
        <i key={index} style={{ "--i": index } as CSSProperties}>
          {star}
        </i>
      ))}
    </span>
  );
}
