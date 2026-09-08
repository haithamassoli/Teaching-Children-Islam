const RATE = 16_000;
const MAX_SAMPLES = RATE * 300;

export function encodeWav(samples: Float32Array): ArrayBuffer {
  if (!samples.length || samples.length > MAX_SAMPLES) {
    throw new Error("INVALID_RECORDING_DURATION");
  }
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  for (const [offset, text] of [
    [0, "RIFF"],
    [8, "WAVE"],
    [12, "fmt "],
    [36, "data"],
  ] as const) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  }
  view.setUint32(4, bytes.byteLength - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, RATE, true);
  view.setUint32(28, RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, sample * (sample < 0 ? 32768 : 32767), true);
  }
  return bytes;
}

export function inspectWav(bytes: ArrayBuffer) {
  if (bytes.byteLength < 46 || bytes.byteLength > 44 + MAX_SAMPLES * 2 || bytes.byteLength % 2) {
    throw new Error("INVALID_RECORDING_SIZE");
  }
  const view = new DataView(bytes);
  const text = (offset: number) => String.fromCharCode(...new Uint8Array(bytes, offset, 4));
  if (
    text(0) !== "RIFF" ||
    text(8) !== "WAVE" ||
    text(12) !== "fmt " ||
    text(36) !== "data" ||
    view.getUint32(4, true) !== bytes.byteLength - 8 ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== RATE ||
    view.getUint32(28, true) !== RATE * 2 ||
    view.getUint16(32, true) !== 2 ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== bytes.byteLength - 44
  ) {
    throw new Error("INVALID_RECORDING_FORMAT");
  }
  return { durationMs: ((bytes.byteLength - 44) / (RATE * 2)) * 1000, size: bytes.byteLength };
}
