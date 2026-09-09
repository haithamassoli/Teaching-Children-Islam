export function numberInRange(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : fallback;
}

export function nextPlayback(
  verseIndex: number,
  pass: number,
  repeats: number,
  verseCount: number,
  continuous: boolean,
) {
  if (pass < repeats) {
    return { verseIndex, pass: pass + 1 };
  }
  if (continuous && verseIndex + 1 < verseCount) {
    return { verseIndex: verseIndex + 1, pass: 1 };
  }
  return null;
}
