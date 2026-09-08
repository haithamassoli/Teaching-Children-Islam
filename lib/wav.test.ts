import { expect, test } from "vitest";
import { encodeWav, inspectWav } from "./wav";

test("recording duration comes from validated PCM bytes, not client metadata", () => {
  const wav = encodeWav(new Float32Array(16_000));
  expect(inspectWav(wav)).toEqual({ durationMs: 1000, size: 32_044 });
  const forged = wav.slice(0);
  new DataView(forged).setUint32(24, 1, true);
  expect(() => inspectWav(forged)).toThrow("INVALID_RECORDING_FORMAT");
  expect(() => inspectWav(new ArrayBuffer(44 + 16_000 * 301 * 2))).toThrow(
    "INVALID_RECORDING_SIZE",
  );
  expect(() => inspectWav(wav.slice(0, -2))).toThrow("INVALID_RECORDING_FORMAT");
  expect(() => encodeWav(new Float32Array(0))).toThrow();
});
