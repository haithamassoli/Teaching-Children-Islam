"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { assetUrl } from "../../lib/assets";
import { Buddy, BuddyPicker, playEffect, setPref, useFriend, usePref } from "./buddy";

export function JourneyControls() {
  const sound = usePref("sound", "off") === "on";
  const paused = usePref("motion", "on") === "off";
  const friend = useFriend();
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "off" : "on";
  }, [paused]);
  useEffect(() => {
    if (!sound) {
      return;
    }
    const play = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-sound]")) {
        playEffect("tap");
      }
    };
    document.addEventListener("click", play);
    return () => {
      document.removeEventListener("click", play);
    };
  }, [sound]);
  return (
    <div className="journey-settings">
      <button
        type="button"
        className="setting-button buddy-switch"
        popoverTarget="buddy-popover"
        aria-label={`رفيقي ${friend.name}، غيّره`}
        style={{ background: friend.color }}
      >
        <Image unoptimized src={assetUrl(friend.path)} alt="" width={40} height={40} />
      </button>
      <div id="buddy-popover" popover="auto" className="buddy-popover">
        <p>مَن يرافقك اليوم؟</p>
        <BuddyPicker onPick={() => document.getElementById("buddy-popover")?.hidePopover()} />
      </div>
      <button
        type="button"
        className="setting-button"
        aria-label={sound ? "كتم المؤثرات" : "تشغيل المؤثرات"}
        aria-pressed={sound}
        onClick={() => setPref("sound", sound ? "off" : "on")}
      >
        <Image
          unoptimized
          src={assetUrl(`icons/${sound ? "sound" : "mute"}.svg`)}
          alt=""
          width={23}
          height={23}
        />
      </button>
      <button
        type="button"
        className="setting-button motion-toggle"
        aria-label={paused ? "تشغيل الحركة" : "إيقاف الحركة"}
        aria-pressed={paused}
        onClick={() => setPref("motion", paused ? "on" : "off")}
      >
        <Image
          unoptimized
          src={assetUrl(`icons/${paused ? "play" : "pause"}.svg`)}
          alt=""
          width={23}
          height={23}
        />
      </button>
    </div>
  );
}

export function JourneyFriends() {
  const [picked, setPicked] = useState(false);
  const friend = useFriend();
  return (
    <section className="friends-section reveal">
      <div>
        <p className="section-kicker">رفيق رحلتك</p>
        <h2>اختر صديقًا يرافقك في كل درس!</h2>
        <p>اضغط على صديق لتتعرّف إليه. سيظهر معك في كل صفحة، ويفرح معك عندما تتعلّم.</p>
        <Link href="/explore" className="text-button">
          هيا إلى العوالم مع {friend.name} ←
        </Link>
      </div>
      <div className="friends-play">
        <BuddyPicker onPick={() => setPicked(true)} />
        <Buddy
          className="friends-preview"
          size={130}
          mood={picked ? "happy" : "idle"}
          narrate={picked}
          say={picked ? `${friend.greeting} سأرافقك في الدروس والأسئلة.` : undefined}
        />
      </div>
    </section>
  );
}

export function HeroBuddy() {
  const friend = useFriend();
  const [tap, setTap] = useState(0);
  const lines = [
    `أنا ${friend.name}، هيا نتعلّم معًا`,
    friend.greeting,
    "اضغط «لنبدأ المغامرة» وسأكون معك!",
    "يمكنك اختيار صديق آخر من الزر في الأعلى",
  ];
  return (
    <>
      <div className="guide-bubble" key={tap} aria-live="polite">
        أهلًا يا بطل! <span>{lines[tap % lines.length]}</span>
      </div>
      <button
        type="button"
        className="scene-guide"
        aria-label={`اضغط على ${friend.name} ليكلّمك`}
        onClick={() => {
          setTap(tap + 1);
          playEffect("soft-pop");
        }}
      >
        <Image
          key={tap}
          unoptimized
          src={assetUrl(friend.path)}
          alt=""
          width={440}
          height={440}
          className={tap ? "buddy-hop" : undefined}
          preload
        />
      </button>
    </>
  );
}
