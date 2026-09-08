"use client";

import { useEffect, useRef, useState } from "react";
import { encodeWav, inspectWav } from "../lib/wav";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_DURATION_MS = 5 * 60 * 1000;

export default function Recorder({
  consent,
  upload,
}: {
  consent: boolean;
  upload: (recording: Blob, durationMs: number) => Promise<void>;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const playback = useRef<HTMLAudioElement>(null);
  const mounted = useRef(true);
  const consentRef = useRef(consent);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clip, setClip] = useState<{ blob: Blob; durationMs: number } | null>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  consentRef.current = consent;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      const active = recorder.current;
      if (active?.state === "recording") {
        active.stop();
      }
      active?.stream.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  useEffect(() => {
    if (!clip) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(clip.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip]);

  useEffect(() => {
    if (!url) {
      return;
    }
    const player = playback.current;
    return () => player?.pause();
  }, [url]);

  useEffect(() => {
    if (!consent && recorder.current?.state === "recording") {
      recorder.current.stop();
    }
  }, [consent]);

  async function start() {
    if (!consent || busy || recording) {
      return;
    }
    setMessage("");
    setBusy(true);
    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("unsupported");
      }
      document.querySelectorAll("audio").forEach((audio) => {
        audio.pause();
      });
      window.speechSynthesis?.cancel();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || !consentRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        if (mounted.current && !consentRef.current) {
          setMessage("انتهى إذن التسجيل. اطلب من الوالد تفعيله من جديد.");
        }
        return;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const active = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.current = active;
      const chunks: Blob[] = [];
      let bytes = 0;
      let failed = false;
      let stopping = false;
      active.ondataavailable = (event) => {
        bytes += event.data.size;
        if (bytes > MAX_BYTES) {
          failed = true;
          if (active.state === "recording") {
            active.stop();
          }
        } else {
          chunks.push(event.data);
        }
      };
      active.onerror = () => {
        failed = true;
        if (active.state === "recording") {
          active.stop();
        }
        active.stream.getTracks().forEach((track) => {
          track.stop();
        });
      };
      active.stream.getTracks().forEach((track) => {
        track.onended = () => {
          const wasRecording = active.state === "recording";
          if (stopping) {
            return;
          }
          failed = true;
          if (wasRecording) {
            active.stop();
          }
        };
      });
      active.onstop = async () => {
        stopping = true;
        clearTimeout(timer.current);
        active.stream.getTracks().forEach((track) => {
          track.stop();
        });
        if (!mounted.current) {
          return;
        }
        setRecording(false);
        if (!consentRef.current || failed || !bytes) {
          setMessage("تعذر حفظ المقطع. حاول تسجيل مقطع أقصر، أو سمّع مباشرة للوالد.");
          return;
        }
        setBusy(true);
        let context: AudioContext | undefined;
        try {
          context = new AudioContext();
          const decoded = await context.decodeAudioData(await new Blob(chunks).arrayBuffer());
          const frames = Math.min(Math.round(decoded.duration * 16_000), 300 * 16_000);
          const resample = new OfflineAudioContext(1, frames, 16_000);
          const source = resample.createBufferSource();
          source.buffer = decoded;
          source.connect(resample.destination);
          source.start();
          const audio = await resample.startRendering();
          const wav = encodeWav(audio.getChannelData(0));
          if (mounted.current && consentRef.current) {
            setClip({
              blob: new Blob([wav], { type: "audio/wav" }),
              durationMs: inspectWav(wav).durationMs,
            });
            setMessage("استمع إلى المقطع قبل إرساله. لم يُرسل بعد.");
          }
        } catch {
          if (mounted.current) {
            setMessage("تعذر تجهيز المقطع. حاول التسجيل من جديد أو سمّع للوالد مباشرة.");
          }
        } finally {
          await context?.close();
          if (mounted.current) {
            setBusy(false);
          }
        }
      };
      active.start(1000);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (active.state === "recording") {
          active.stop();
        }
      }, MAX_DURATION_MS);
    } catch {
      stream?.getTracks().forEach((track) => {
        track.stop();
      });
      setMessage("لم نتمكن من استخدام الميكروفون. تحقق من إذنه، أو سمّع مباشرة للوالد.");
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  async function submit() {
    if (!clip || !consent || busy || recording) {
      return;
    }
    if (!navigator.onLine) {
      setMessage("لا يوجد اتصال. المقطع باقٍ هنا؛ أعد الإرسال عند الاتصال.");
      return;
    }
    setBusy(true);
    setMessage("جارٍ الإرسال…");
    try {
      await upload(clip.blob, clip.durationMs);
      if (mounted.current) {
        setClip(null);
        setMessage("تم الإرسال للوالد للمراجعة.");
      }
    } catch {
      if (mounted.current) {
        setMessage("لم ينجح الإرسال. احتفظنا بالمقطع هنا لتعيد المحاولة.");
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }

  return (
    <section aria-label="تسجيل الحفظ" data-recording={recording || busy}>
      <p>التسجيل اختياري وبإذن الوالد، حتى ٥ دقائق. يُحذف المقطع غير المرسل عند مغادرة الصفحة.</p>
      {!consent && <p>اطلب من الوالد تفعيل إذن التسجيل، أو سمّع له مباشرة.</p>}
      {recording ? (
        <>
          <p role="status">● الميكروفون يعمل — جارٍ التسجيل</p>
          <button type="button" onClick={() => recorder.current?.stop()}>
            إيقاف التسجيل
          </button>
        </>
      ) : (
        <button type="button" disabled={!consent || busy} onClick={start}>
          {clip ? "تسجيل مقطع جديد" : "بدء التسجيل"}
        </button>
      )}
      {url && !recording && (
        <>
          {/* The learner's unscripted audio has no generated transcript. */}
          {/* biome-ignore lint/a11y/useMediaCaption: Private learner recording, not prerecorded instructional media. */}
          <audio
            ref={playback}
            src={url}
            controls
            preload="none"
            aria-label="الاستماع إلى تسجيلي"
            onPlay={(event) => {
              const current = event.currentTarget;
              document.querySelectorAll("audio").forEach((audio) => {
                if (audio !== current) {
                  audio.pause();
                }
              });
            }}
          />
          <button type="button" disabled={!consent || busy} onClick={submit}>
            إرسال للوالد
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setClip(null);
              setMessage("");
            }}
          >
            حذف المقطع المحلي
          </button>
        </>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
