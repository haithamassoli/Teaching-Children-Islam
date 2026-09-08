"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import Memorization from "./memorization";
import { ReadAloud } from "./narration";

export function recordingSite() {
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (site) {
    return site;
  }
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!cloud) {
    throw new Error("CONVEX_SITE_URL_MISSING");
  }
  return cloud.replace(".convex.cloud", ".convex.site");
}

export default function ChildReview({ childId }: { childId: Id<"children"> }) {
  const items = useQuery(api.review.items, { childId });
  const train = useMutation(api.review.markTraining);
  const requestReview = useMutation(api.review.requestLiveReview);
  const token = useAuthToken();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function practice(itemId: string, request: boolean) {
    if (busy) {
      return;
    }
    if (!navigator.onLine) {
      setNotice("لا يوجد اتصال. أعد المحاولة بعد عودته.");
      return;
    }
    setBusy(true);
    try {
      const save = request ? requestReview : train;
      await save({ childId, itemId, kind: "practice" });
      setNotice(request ? "وصل طلبك إلى الوالد للتأكيد." : "حفظنا أنك تدرّبت على الخطوات.");
    } catch {
      setNotice("تعذر تأكيد الحفظ. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }
  if (!items) {
    return <p>نحمّل الحفظ والتطبيق…</p>;
  }
  return (
    <>
      <Memorization
        items={items.memorization.map((item) => ({
          ...item,
          audioAsset: item.audioAsset
            ? `/api/assets/${item.audioAsset.replace(/^assets\//, "")}`
            : undefined,
        }))}
        consent={items.consent}
        train={(itemId) => train({ childId, itemId, kind: "memorization" })}
        requestReview={(itemId) => requestReview({ childId, itemId, kind: "memorization" })}
        upload={async (itemId, blob) => {
          if (!token) {
            throw new Error("UNAUTHENTICATED");
          }
          const response = await fetch(
            `${recordingSite()}/recordings?childId=${childId}&itemId=${encodeURIComponent(itemId)}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "audio/wav" },
              body: blob,
            },
          );
          if (!response.ok) {
            throw new Error("UPLOAD_FAILED");
          }
        }}
      />
      <section className="account-card">
        <h2>التطبيق مع الوالد</h2>
        {!items.practice.length && <p>لا مهام تطبيق معتمدة بعد.</p>}
        {items.practice.map((item) => (
          <article key={item.id} data-narration={item.instruction}>
            <p>{item.instruction}</p>
            <ReadAloud />
            <p>
              {
                (
                  {
                    approved: "أكد الوالد التطبيق",
                    pending: "بانتظار الوالد",
                    training: "تدرّبت على الخطوات",
                    retry: "لنتدرّب مرة أخرى",
                    not_started: "لم يبدأ",
                  } as Record<string, string>
                )[item.status]
              }
            </p>
            <button
              type="button"
              disabled={busy}
              className="outline-button"
              onClick={() => practice(item.id, false)}
            >
              تدرّبت
            </button>
            <button
              type="button"
              disabled={busy}
              className="primary-button"
              onClick={() => practice(item.id, true)}
            >
              أطلب تأكيد الوالد
            </button>
          </article>
        ))}
        <p role="status">{notice}</p>
      </section>
    </>
  );
}
