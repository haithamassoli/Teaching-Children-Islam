import type { ReactNode } from "react";

// Book answers are strings, ordered lists or matching maps; render whichever shape arrives.
export function AnswerText({ value }: { value: unknown }): ReactNode {
  if (Array.isArray(value)) {
    return (
      <ol>
        {value.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: immutable source answer may contain repeated values.
          <li key={`${index}-${String(item)}`}>
            <AnswerText value={item} />
          </li>
        ))}
      </ol>
    );
  }
  if (value && typeof value === "object") {
    return (
      <dl>
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>
              <AnswerText value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value ?? "")}</span>;
}
