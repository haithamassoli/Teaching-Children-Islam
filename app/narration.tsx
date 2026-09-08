"use client";

import { useEffect, useRef, useState } from "react";

const preferenceKey = "arabic-narration";
const readyMessage = "نقرأ معًا عند ظهور الدرس أو السؤال. اضغط استمع إن لم يبدأ الصوت.";
const offMessage = "القراءة التلقائية متوقفة. يمكنك الضغط على استمع.";

function textOf(element: HTMLElement) {
  return (
    element.dataset.narration ||
    [...element.querySelectorAll<HTMLElement>("[data-narration-text]")]
      .map((part) => part.innerText)
      .join("\n")
  ).trim();
}

function visible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return (
    element.isConnected &&
    rect.height > 0 &&
    rect.bottom > 80 &&
    rect.top < window.innerHeight - 130 &&
    !element.closest("details:not([open]), [hidden]")
  );
}

export function ReadAloud() {
  return (
    <button type="button" className="sound-button" data-read-aloud>
      <span aria-hidden="true">🔊</span> استمع
    </button>
  );
}

export default function Narration() {
  const [enabled, setEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [rate, setRate] = useState("0.9");
  const [message, setMessage] = useState(readyMessage);
  const controls = useRef<{
    toggle: () => void;
    replay: () => void;
    stop: () => void;
    speed: (value: string) => void;
  } | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setMessage("القراءة الصوتية غير متاحة في هذا المتصفح. جرّب متصفحًا يدعم الصوت.");
      return;
    }
    const synth = window.speechSynthesis;
    let auto = true;
    let speed = 0.9;
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? "null");
      auto = saved?.enabled !== false;
      if ([0.8, 0.9, 1].includes(saved?.rate)) {
        speed = saved.rate;
      }
    } catch {
      // Storage can be unavailable in private browsing; keep the session usable.
    }
    setEnabled(auto);
    setRate(String(speed));
    let voice: SpeechSynthesisVoice | undefined;
    let blocked = false;
    let frame = 0;
    let current: {
      element: HTMLElement;
      text: string;
      utterance?: SpeechSynthesisUtterance;
    } | null = null;
    const read = new WeakMap<HTMLElement, string>();
    const regions = () => [...document.querySelectorAll<HTMLElement>("[data-narration]")];
    const recording = () => Boolean(document.querySelector('[data-recording="true"]'));
    const otherAudio = () =>
      [...document.querySelectorAll<HTMLMediaElement>("audio, video")].some(
        (player) => !player.paused && !player.ended,
      );
    const save = () => {
      setEnabled(auto);
      setRate(String(speed));
      try {
        localStorage.setItem(preferenceKey, JSON.stringify({ enabled: auto, rate: speed }));
      } catch {
        // A blocked storage write must not interrupt narration.
      }
    };
    const stop = () => {
      current?.element.removeAttribute("data-narration-active");
      current = null;
      synth.cancel();
      setSpeaking(false);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(advance);
    };
    const play = (element: HTMLElement) => {
      const text = textOf(element);
      if (!text || recording() || document.hidden) {
        return;
      }
      stop();
      if (!voice) {
        setMessage("لا يوجد صوت عربي على جهازك. أضف صوتًا عربيًا من إعدادات الجهاز ثم أعد المحاولة.");
        return;
      }
      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((player) => {
        player.pause();
      });
      read.set(element, text);
      const active = {
        element,
        text,
        utterance: undefined as SpeechSynthesisUtterance | undefined,
      };
      current = active;
      element.setAttribute("data-narration-active", "true");
      // Short utterances keep long stories working with device speech engines.
      const chunks = text.match(/.{1,220}(?:\s|$)|\S{1,220}/gu) ?? [text];
      let index = 0;
      const next = () => {
        if (current !== active) {
          return;
        }
        if (index === chunks.length) {
          stop();
          setMessage(auto ? readyMessage : offMessage);
          schedule();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index++]);
        active.utterance = utterance;
        utterance.voice = voice ?? null;
        utterance.lang = voice?.lang ?? "ar-SA";
        utterance.rate = speed;
        utterance.onstart = () => {
          if (current === active) {
            setSpeaking(true);
            setMessage("نقرأ معًا…");
          }
        };
        utterance.onend = next;
        utterance.onerror = (event) => {
          if (current !== active) {
            return;
          }
          stop();
          blocked = true;
          read.delete(element);
          setMessage(
            event.error === "not-allowed"
              ? "اضغط استمع لتبدأ القراءة، ثم نكمل تلقائيًا."
              : "تعذر تشغيل الصوت العربي. اضغط استمع لإعادة المحاولة.",
          );
        };
        synth.speak(utterance);
      };
      next();
    };
    function advance() {
      if (document.hidden || recording() || otherAudio()) {
        stop();
        return;
      }
      if (current && (!visible(current.element) || textOf(current.element) !== current.text)) {
        stop();
      }
      if (current || !auto || blocked || !voice) {
        return;
      }
      const element = regions().find(
        (region) =>
          visible(region) && Boolean(textOf(region)) && read.get(region) !== textOf(region),
      );
      if (element) {
        play(element);
      }
    }
    const voicesChanged = () => {
      // ponytail: voice quality depends on the device; reviewed recordings can provide a uniform voice.
      const arabic = synth.getVoices().filter((item) => /^ar(?:[-_]|$)/i.test(item.lang));
      voice =
        arabic.find((item) => item.lang === "ar-SA") ??
        arabic.find((item) => item.default) ??
        arabic[0];
      if (voice) {
        setMessage(auto ? readyMessage : offMessage);
      } else {
        setMessage("بانتظار صوت عربي. اضغط استمع للتحقق من أصوات جهازك.");
      }
      schedule();
    };
    const click = (event: Event) => {
      if (!(event.target instanceof Element)) {
        return;
      }
      const button = event.target.closest("[data-read-aloud]");
      if (button) {
        const element = button.closest<HTMLElement>("[data-narration]");
        blocked = false;
        voicesChanged();
        if (element) {
          play(element);
        }
      } else if (!event.target.closest(".narration-controls") && blocked) {
        blocked = false;
        advance();
      }
    };
    const mediaStarted = () => stop();
    const visibilityChanged = () => {
      if (document.hidden) {
        stop();
      } else {
        schedule();
      }
    };
    controls.current = {
      toggle: () => {
        auto = !auto;
        blocked = false;
        save();
        stop();
        setMessage(auto ? readyMessage : offMessage);
        if (auto) {
          const element = regions().find(visible);
          if (element) {
            play(element);
          }
        }
      },
      replay: () => {
        const element = current?.element ?? regions().find(visible);
        blocked = false;
        voicesChanged();
        if (element) {
          play(element);
        }
      },
      stop: () => {
        auto = false;
        save();
        stop();
        setMessage("توقف الصوت. اضغط استمع أو فعّل القراءة التلقائية للمتابعة.");
      },
      speed: (value) => {
        if (!["0.8", "0.9", "1"].includes(value)) {
          return;
        }
        speed = Number(value);
        save();
        if (current) {
          play(current.element);
        }
      },
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["data-narration", "data-recording", "open", "hidden"],
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", visibilityChanged);
    document.addEventListener("click", click);
    document.addEventListener("play", mediaStarted, true);
    synth.addEventListener("voiceschanged", voicesChanged);
    voicesChanged();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", visibilityChanged);
      document.removeEventListener("click", click);
      document.removeEventListener("play", mediaStarted, true);
      synth.removeEventListener("voiceschanged", voicesChanged);
      controls.current = null;
      stop();
    };
  }, []);

  return (
    <aside className="narration-controls" aria-label="القراءة العربية">
      <div className="narration-buttons">
        <button type="button" aria-pressed={enabled} onClick={() => controls.current?.toggle()}>
          {enabled ? "🔊 القراءة التلقائية" : "🔇 تشغيل القراءة التلقائية"}
        </button>
        <button type="button" onClick={() => controls.current?.replay()}>
          أعد القراءة
        </button>
        <button type="button" disabled={!speaking} onClick={() => controls.current?.stop()}>
          إيقاف الصوت
        </button>
        <label>
          السرعة
          <select value={rate} onChange={(event) => controls.current?.speed(event.target.value)}>
            <option value="0.8">بطيئة</option>
            <option value="0.9">هادئة</option>
            <option value="1">عادية</option>
          </select>
        </label>
      </div>
      <p role="status">{message}</p>
    </aside>
  );
}
