const encoder = new TextEncoder();

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes = 32) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function hashPin(pin: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  return hex(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
      key,
      256,
    ),
  );
}

export function validPin(pin: string) {
  return /^\d{4}$/.test(pin);
}
