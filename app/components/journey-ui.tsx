import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { arabicNumber, assetUrl, worldArt } from "../../lib/assets";
import { JourneyControls } from "./journey-controls";

export function Asset({
  path,
  alt = "",
  width = 32,
  height = width,
  className,
  preload = false,
}: {
  path: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      unoptimized
      src={assetUrl(path)}
      alt={alt}
      width={width}
      height={height}
      className={className}
      preload={preload}
    />
  );
}

export function JourneyHeader({
  active = "home",
}: {
  active?: "home" | "explore" | "library" | "quran" | "family";
}) {
  return (
    <header className="journey-header">
      <Link href="/" className="journey-brand" aria-label="رِحلة الإسلام، الرئيسية">
        <Image src="/icon.svg" alt="" width={48} height={48} />
        <span>
          رِحلة الإسلام<small>خطوات صغيرة، خيرٌ كثير</small>
        </span>
      </Link>
      <nav className="journey-nav" aria-label="التنقل الرئيسي">
        {(
          [
            ["home", "/", "الرئيسية", "home"],
            ["explore", "/explore", "عوالم التعلّم", "map"],
            ["library", "/library", "مكتبتي", "book"],
            ["quran", "/quran", "القرآن", "mosque"],
          ] as const
        ).map(([id, href, label, icon]) => (
          <Link key={id} href={href} aria-current={active === id ? "page" : undefined} data-sound>
            <Asset path={`icons/${icon}.svg`} width={24} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="journey-actions">
        <JourneyControls />
        <Link
          href="/family"
          className="family-link"
          aria-current={active === "family" ? "page" : undefined}
        >
          <Asset path="icons/parent.svg" width={22} />
          منطقة الأسرة
        </Link>
      </div>
    </header>
  );
}

export function JourneyFooter() {
  return (
    <footer className="journey-footer">
      <span>
        رِحلة الإسلام <b>✦</b> نتعلّم اليوم، ونزهر غدًا
      </span>
      <nav aria-label="روابط الموقع">
        <Link href="/credits">الكتاب والأصول</Link>
        <Link href="/privacy">الخصوصية</Link>
        <Link href="/family">حساب الأسرة</Link>
      </nav>
    </footer>
  );
}

export const worldDescriptions: Record<string, string> = {
  faith: "نتعرّف إلى إيماننا، خطوةً خطوة",
  manners: "تفاصيل صغيرة تجعل يومنا أجمل",
  conduct: "نختار الخير في كل يوم",
  worship: "نتعلّم ونتدرّب معًا",
  quran: "نقرأ ونتأمّل المعاني",
  stories: "حكاية نسمعها، وعبرة نتعلّمها",
  memorization: "نكرّر قليلًا، ونحفظ بثبات",
};

export function WorldCard({
  world,
  count,
  index,
}: {
  world: { id: string; title: string };
  count: number;
  index: number;
}) {
  return (
    <Link
      href={`/explore?world=${world.id}`}
      className={`explore-world world-${world.id} reveal`}
      data-narration={`عالم ${world.title}. ${worldDescriptions[world.id]}`}
      style={{ "--order": index } as CSSProperties}
      data-sound
    >
      <div className="world-picture">
        <Asset path={`fantasy/worlds/${worldArt(world.id)}.svg`} width={480} height={320} />
        <span className="world-index">{arabicNumber(index + 1).padStart(2, "٠")}</span>
      </div>
      <div className="world-copy">
        <Asset
          path={`fantasy/badges/${worldArt(world.id)}-earned.svg`}
          width={54}
          className="world-emblem"
        />
        <span className="world-lessons">{arabicNumber(count)} درسًا</span>
        <h3>عالم {world.title}</h3>
        <p>{worldDescriptions[world.id]}</p>
        <span className="world-enter">
          هيا نستكشف <span aria-hidden="true">←</span>
        </span>
      </div>
    </Link>
  );
}
