// ArrayBuffer → base64 на части. btoa(String.fromCharCode(...bytes)) гърми
// („Maximum call stack size exceeded“) при PDF над ~100 KB — напр. с лого и шрифтове.
export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return btoa(bin);
}
