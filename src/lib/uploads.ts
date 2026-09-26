import path from "path";

// Качени файлове: само растерни изображения, разпознати по съдържание (magic bytes),
// не по името/разширението от клиента. SVG не се приема — може да съдържа скрипт.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

const SIGNATURES: { ext: string; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", mime: "image/gif", test: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  { ext: "webp", mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { ext: "heic", mime: "image/heic", test: (b) => b.subarray(4, 8).toString("ascii") === "ftyp" && /^(heic|heix|mif1|msf1)$/.test(b.subarray(8, 12).toString("ascii")) },
];

export function detectImage(buf: Buffer): { ext: string; mime: string } | null {
  const hit = SIGNATURES.find((s) => buf.length >= 12 && s.test(buf));
  return hit ? { ext: hit.ext, mime: hit.mime } : null;
}

export const IMAGE_MIME: Record<string, string> = Object.fromEntries(SIGNATURES.map((s) => [s.ext, s.mime]));

/** Файлът е вътре в dir (с проверка по сегменти, не по префикс на низ). */
export function isInside(dir: string, file: string): boolean {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

// Заглавия за сервиране на качени файлове: без MIME sniffing и без изпълнение
export const SAFE_FILE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
};
