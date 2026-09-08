import Link from "next/link";
import { Asset } from "../components/journey-ui";
import styles from "./fantasy.module.css";

export default function FantasyInvite() {
  return (
    <section className={styles.invite} aria-labelledby="fantasy-invite-title">
      <div>
        <span className={styles.eyebrow}>أصدقاء جدد فوق السحاب</span>
        <h2 id="fantasy-invite-title">اكتشف جزر العجائب!</h2>
        <p>شخصيات كيوت، وجزر خيالية، وكنوز صغيرة تنتظرك.</p>
        <Link href="/fantasy" className={styles.button}>
          ادخل عالم الخيال ←
        </Link>
      </div>
      <div>
        <Asset path="fantasy/characters/wameed.webp" width={180} />
        <Asset path="fantasy/characters/ghayma.webp" width={180} />
      </div>
    </section>
  );
}
