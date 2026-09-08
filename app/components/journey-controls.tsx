"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { characters as friends } from "../../assets/fantasy/catalog.json";
import { assetUrl } from "../../lib/assets";

export function JourneyControls() {
  const [sound, setSound] = useState(false);
  const [paused, setPaused] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "off" : "on";
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [paused]);
  useEffect(() => {
    if (!sound) {
      return;
    }
    const play = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("[data-sound]")) {
        return;
      }
      if (
        window.speechSynthesis?.speaking ||
        document.querySelector('[data-recording="true"]') ||
        [...document.querySelectorAll("audio")].some(
          (player) => player !== audio.current && !player.paused,
        )
      ) {
        return;
      }
      if (audio.current) {
        audio.current.currentTime = 0;
        audio.current.volume = 0.25;
        void audio.current.play().catch(() => {});
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
        className="setting-button"
        aria-label={sound ? "كتم المؤثرات" : "تشغيل المؤثرات"}
        aria-pressed={sound}
        onClick={() => {
          audio.current?.pause();
          setSound(!sound);
        }}
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
        onClick={() => setPaused(!paused)}
      >
        <Image
          unoptimized
          src={assetUrl(`icons/${paused ? "play" : "pause"}.svg`)}
          alt=""
          width={23}
          height={23}
        />
      </button>
      {/* biome-ignore lint/a11y/useMediaCaption: optional nonverbal tap sound, no spoken content. */}
      <audio ref={audio} src={assetUrl("audio/effects/tap.wav")} preload="none" />
    </div>
  );
}

export function JourneyFriends() {
  const [selected, setSelected] = useState(friends[0].id);
  return (
    <section className="friends-section reveal">
      <div>
        <p className="section-kicker">أصدقاء الرحلة</p>
        <h2>كل مغامرة أحلى مع صديق!</h2>
        <p
          aria-live="polite"
          data-narration={friends.find((friend) => friend.id === selected)?.greeting}
        >
          {friends.find((friend) => friend.id === selected)?.greeting}
        </p>
        <Link href="/explore" className="text-button">
          هيا إلى العوالم ←
        </Link>
      </div>
      <fieldset className="journey-friends">
        <legend className="sr-only">تعرّف إلى أصدقاء الرحلة</legend>
        {friends.map((friend) => (
          <button
            type="button"
            key={friend.id}
            aria-pressed={selected === friend.id}
            onClick={() => setSelected(friend.id)}
            data-sound
          >
            <Image unoptimized src={assetUrl(friend.path)} alt="" width={160} height={160} />
            <span>{friend.name}</span>
          </button>
        ))}
      </fieldset>
    </section>
  );
}
