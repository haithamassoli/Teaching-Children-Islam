"use client";

import { useState } from "react";
import Activity, { type ActivityAnswer, type ActivityQuestion } from "../../activity";

const cases: Record<string, ActivityQuestion> = {
  choice: {
    id: "qa-choice",
    type: "multiple_choice",
    prompt: "Choice template",
    options: ["Wrong", "Correct"],
  },
  ordering: {
    id: "qa-ordering",
    type: "ordering",
    prompt: "Ordering template",
    items: ["First", "Second", "Third"],
  },
  matching: {
    id: "qa-matching",
    type: "matching",
    prompt: "Matching template",
    left: ["Left one", "Left two"],
    right: ["Right one", "Right two"],
  },
  multi: {
    id: "qa-multi",
    type: "multiple_select",
    prompt: "Multiple select template",
    options: ["Keep", "Also keep", "Reject"],
  },
  open: { id: "qa-open", type: "parent_discussion", prompt: "Parent review template" },
};

export default function ActivitiesHarness() {
  const [kind, setKind] = useState("choice");
  const [failSubmit, setFailSubmit] = useState(false);

  function answerIsCorrect(answer: ActivityAnswer) {
    if (kind === "choice") {
      return answer === "Correct";
    }
    if (kind === "ordering") {
      return JSON.stringify(answer) === JSON.stringify(["First", "Second", "Third"]);
    }
    if (kind === "matching") {
      return (
        JSON.stringify(answer) ===
        JSON.stringify({ "Left one": "Right one", "Left two": "Right two" })
      );
    }
    if (kind === "multi") {
      return JSON.stringify(answer) === JSON.stringify(["Keep", "Also keep"]);
    }
    return null;
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Activity technical QA</h1>
      <p>This is a development-only harness. It contains no learner or religious content.</p>
      <fieldset>
        <legend>Choose template</legend>
        {Object.keys(cases).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setKind(name)}
            aria-pressed={kind === name}
          >
            {name}
          </button>
        ))}
      </fieldset>
      <label style={{ display: "block", margin: "1rem 0" }}>
        <input
          id="qa-fail-submit"
          type="checkbox"
          checked={failSubmit}
          onChange={(event) => setFailSubmit(event.target.checked)}
        />{" "}
        Simulate submit failure
      </label>
      <p>Technical result: responses are simulated locally and are not saved.</p>
      <Activity
        key={kind}
        question={cases[kind]}
        age={7}
        submit={async (answer) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          if (failSubmit) {
            throw new Error("technical QA failure");
          }
          const correct = answerIsCorrect(answer);
          let explanation = "Technical review: parent review required.";
          if (correct === true) {
            explanation = "Technical success: correct.";
          } else if (correct === false) {
            explanation = "Technical retry: try again.";
          }
          return {
            correct,
            explanation,
          };
        }}
      />
    </main>
  );
}
