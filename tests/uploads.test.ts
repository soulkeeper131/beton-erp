import { describe, it, expect } from "vitest";
import path from "path";
import { detectImage, isInside } from "@/lib/uploads";

describe("качени файлове", () => {
  it("разпознава изображения по съдържание, не по име", () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext).toBe("jpg");
    expect(detectImage(Buffer.from("89504e470d0a1a0a0000000d", "hex"))?.ext).toBe("png");
    expect(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>'))).toBeNull();
    expect(detectImage(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
  });
  it("isInside не се лъже от ../ и от общ префикс", () => {
    const dir = path.resolve("data/incoming-invoices");
    expect(isInside(dir, path.join(dir, "a.pdf"))).toBe(true);
    expect(isInside(dir, path.resolve("data/sqlite.db"))).toBe(false);
    expect(isInside(dir, path.join(dir, "../sqlite.db"))).toBe(false);
    expect(isInside(dir, path.resolve("data/incoming-invoices-evil/a.pdf"))).toBe(false);
    expect(isInside(dir, dir)).toBe(false);
  });
});
