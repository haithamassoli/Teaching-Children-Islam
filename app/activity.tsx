"use client";

import { useState } from "react";

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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [passed, setPassed] = useState(false);
  const ordered = ["ordering", "verse_order"].includes(question.type);
  const matching = ["matching", "source_reference_match"].includes(question.type);
  const choice = ["multiple_choice", "multiple_select", "story_choice"].includes(question.type);
  const written = ["short_answer", "numeric", "parent_discussion"].includes(question.type);

  async function check() {
    if (busy || passed) {
      return;
    }
    if (!navigator.onLine) {
      setFeedback("لا يوجد اتصال. أعد المحاولة عند عودة الإنترنت.");
      return;
    }
    let answer: ActivityAnswer = value;
    if (ordered || question.type === "multiple_select") {
      answer = selected;
    } else if (matching) {
      answer = pairs;
    }
    setBusy(true);
    setFeedback("");
    try {
      const result = await submit(answer);
      setPassed(result.correct === true);
      const lead =
        result.correct === null ? "ناقش هذه الإجابة مع الوالد؛ لا تمنح نجومًا تلقائيًا. " : "";
      setFeedback(lead + result.explanation);
    } catch {
      setFeedback("لم تُحفظ الإجابة. احتفظنا باختيارك؛ أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  function toggle(item: string) {
    setSelected((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item],
    );
    setFeedback("");
  }

  if (!ordered && !matching && !choice && !written) {
    return <p role="alert">هذا النشاط غير متاح بعد. عُد إلى الخريطة.</p>;
  }

  return (
    <section className="account-card" aria-label="نشاط الفهم">
      <h2>{question.prompt}</h2>
      <p>{question.age_instructions?.[age < 8 ? "6-7" : "8-10"]}</p>
      <fieldset disabled={busy || passed}>
        <legend>إجابتك</legend>
        {choice && (
          <div className="account-links">
            {question.options?.map((option) => (
              <button
                key={option}
                type="button"
                className="outline-button"
                aria-pressed={
                  question.type === "multiple_select" ? selected.includes(option) : value === option
                }
                onClick={() => {
                  if (question.type === "multiple_select") {
                    toggle(option);
                  } else {
                    setValue(option);
                    setFeedback("");
                  }
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        {ordered && (
          <>
            <p>انقر على العناصر بالترتيب. لإزالة عنصر انقر عليه مرة أخرى.</p>
            <div className="account-links">
              {question.items?.map((item) => (
                <button
                  type="button"
                  key={item}
                  className="outline-button"
                  aria-pressed={selected.includes(item)}
                  onClick={() => toggle(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <ol aria-label="الترتيب الذي اخترته">
              {selected.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <button type="button" onClick={() => setSelected([])}>
              إعادة الترتيب
            </button>
          </>
        )}
        {matching &&
          question.left?.map((item) => (
            <label key={item}>
              {item}
              <select
                value={pairs[item] ?? ""}
                onChange={(event) => setPairs({ ...pairs, [item]: event.target.value })}
              >
                <option value="">اختر ما يناسب</option>
                {question.right?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        {written && (
          <label>
            {question.type === "numeric" ? "اكتب العدد" : "اكتب إجابتك ليراجعها الوالد"}
            <input
              type="text"
              inputMode={question.type === "numeric" ? "decimal" : "text"}
              value={value}
              maxLength={2000}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        )}
      </fieldset>
      <button className="primary-button" type="button" disabled={busy || passed} onClick={check}>
        {busy ? "جارٍ التحقق…" : "تحقق من إجابتي"}
      </button>
      <p role="status" aria-live="polite">
        {passed ? "✓ " : ""}
        {feedback}
      </p>
    </section>
  );
}
