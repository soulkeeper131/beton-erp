import { describe, it, expect } from "vitest";
import { bufferToBase64 } from "@/lib/base64";

describe("bufferToBase64", () => {
  it("голям PDF (> 100 KB) без препълване на стека", () => {
    const bytes = new Uint8Array(400_000).map((_, i) => (i * 31) % 256);
    expect(bufferToBase64(bytes.buffer)).toBe(Buffer.from(bytes).toString("base64"));
  });
});
