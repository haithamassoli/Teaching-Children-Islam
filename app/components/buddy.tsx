"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import { characters as friends } from "../../assets/fantasy/catalog.json";
import { assetUrl } from "../../lib/assets";

export type Mood = "idle" | "happy" | "oops" | "thinking";
export type Friend = (typeof friends)[number];

// Tiny localStorage store shared by the companion, sound and motion toggles.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};
function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function setPref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing can block storage; the choice still applies until reload.
  }
  for (const listener of listeners) {
    listener();
  }
}
export function usePref(key: string, fallback: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
}

export function useFriend() {
  const id = usePref("buddy", friends[0].id);
  return friends.find((friend) => friend.id === id) ?? friends[0];
}

export function playEffect(name: "tap" | "soft-pop" | "soft-swish" | "page-turn") {
  if (
    read("sound") !== "on" ||
    window.speechSynthesis?.speaking ||
    document.querySelector('[data-recording="true"]') ||
    [...document.querySelectorAll("audio")].some((player) => !player.paused)
  ) {
    return;
  }
  const effect = new Audio(assetUrl(`audio/effects/${name}.wav`));
  effect.volume = 0.25;
  void effect.play().catch(() => {});
}

export function Buddy({
  say,
  mood = "idle",
  size = 120,
  className = "",
  narrate = false,
}: {
  say?: string;
  mood?: Mood;
  size?: number;
  className?: string;
  narrate?: boolean;
}) {
  const friend = useFriend();
  const [hops, setHops] = useState(0);
  const line = say ?? friend.greeting;
  return (
    <div className={`buddy ${className}`} data-mood={mood}>
      <button
        type="button"
        className="buddy-figure"
        style={{ background: friend.color }}
        aria-label={line ? `${friend.name} يقول: ${line}` : friend.name}
        onClick={() => {
          setHops(hops + 1);
          playEffect("soft-pop");
        }}
      >
        <Image
          key={hops}
          unoptimized
          src={assetUrl(friend.path)}
          alt=""
          width={size}
          height={size}
          className={hops ? "buddy-hop" : undefined}
        />
      </button>
      {line && (
        <p className="buddy-bubble" data-narration={narrate ? line : undefined}>
          <b>{friend.name}</b>
          {line}
        </p>
      )}
    </div>
  );
}

export function BuddyPicker({ onPick }: { onPick?: (friend: Friend) => void }) {
  const current = useFriend();
  return (
    <fieldset className="buddy-picker">
      <legend className="sr-only">اختر رفيق رحلتك</legend>
      {friends.map((friend) => (
        <button
          type="button"
          key={friend.id}
          aria-pressed={current.id === friend.id}
          style={{ background: friend.color }}
          onClick={() => {
            setPref("buddy", friend.id);
            playEffect("soft-pop");
            onPick?.(friend);
          }}
        >
          <Image unoptimized src={assetUrl(friend.path)} alt="" width={120} height={120} />
          <span>{friend.name}</span>
        </button>
      ))}
    </fieldset>
  );
}

export function ChooseFriend({ id, name }: { id: string; name: string }) {
  const chosen = useFriend().id === id;
  return (
    <button
      type="button"
      className="choose-friend"
      aria-pressed={chosen}
      onClick={() => {
        setPref("buddy", id);
        playEffect("soft-pop");
      }}
    >
      {chosen ? `✓ ${name} رفيقك الآن` : `اجعل ${name} رفيقي`}
    </button>
  );
}

// Lessons whose free practice was finished on this device. Not account stars.
export function markPracticed(id: string) {
  const list = (read("practiced") ?? "").split(",").filter(Boolean);
  if (!list.includes(id)) {
    setPref("practiced", [...list, id].join(","));
  }
}

export function Practiced({ id }: { id: string }) {
  const done = usePref("practiced", "").split(",").includes(id);
  return done ? <span className="practiced-mark">✓ تدرّبت</span> : null;
}

export { friends };
