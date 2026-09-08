"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { arabicNumber, assetUrl } from "../../../lib/assets";
import Activity, { type ActivityQuestion } from "../../activity";
import { checkAnswer } from "./actions";

export default function LessonPractice({
  lessonId,
  questions,
}: {
  lessonId: string;
  questions: ActivityQuestion[];
}) {
  const [age, setAge] = useState(7);
  const [finished, setFinished] = useState<string[]>([]);
  return (
    <section className="lesson-practice" id="practice" aria-label="تدريب الدرس">
      <div className="section-heading">
        <div>
          <p className="section-kicker">والآن، دورك يا بطل</p>
          <h2>نلعب بما تعلّمناه</h2>
          <p>
            تدريب حر. لحفظ تقدّمك ونجومك، ابدأ من <Link href="/family">حساب الأسرة</Link>.
          </p>
        </div>
      </div>
      <fieldset className="age-switch">
        <legend className="sr-only">نمط التعليمات</legend>
        {[7, 9].map((value) => (
          <button
            type="button"
            key={value}
            className={age === value ? "selected" : ""}
            aria-pressed={age === value}
            onClick={() => setAge(value)}
          >
            {value === 7 ? "٦–٧ سنوات" : "٨–١٠ سنوات"}
          </button>
        ))}
      </fieldset>
      <p className="section-kicker" aria-live="polite">
        تدرّبت على {arabicNumber(finished.length)} من {arabicNumber(questions.length)} أسئلة
      </p>
      {questions.map((question) => (
        <Activity
          key={question.id}
          question={question}
          age={age}
          submit={async (answer) => {
            const result = await checkAnswer(lessonId, question.id, answer);
            if (result.correct !== false) {
              setFinished((current) =>
                current.includes(question.id) ? current : [...current, question.id],
              );
            }
            return result;
          }}
        />
      ))}
      {finished.length === questions.length && (
        <div className="practice-reward" role="status">
          <Image
            unoptimized
            src={assetUrl("rewards/celebration.svg")}
            alt=""
            width={600}
            height={300}
            className="reward-confetti"
          />
          <Image unoptimized src={assetUrl("icons/heart.svg")} alt="" width={65} height={65} />
          <h2>أحسنت التعلّم والمحاولة!</h2>
          <p>أكملت تدريبك. ناقش إجاباتك المفتوحة مع الوالد، وجرّب تطبيق ما تعلّمته اليوم.</p>
          <Link href="/explore" className="primary-button">
            اكتشف درسًا آخر ←
          </Link>
        </div>
      )}
    </section>
  );
}
