import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import Imap from "node-imap";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = db.select().from(companySettings).limit(1).get();
  if (!settings?.imapHost) {
    return NextResponse.json({ error: "IMAP не е конфигуриран" }, { status: 400 });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const imap = new Imap({
        user: settings.imapUser,
        password: settings.imapPass,
        host: settings.imapHost,
        port: settings.imapPort,
        tls: settings.imapTls,
        tlsOptions: { rejectUnauthorized: false },
      });

      const timeout = setTimeout(() => {
        imap.destroy();
        reject(new Error("Timeout при свързване"));
      }, 10000);

      imap.once("ready", () => {
        clearTimeout(timeout);
        imap.end();
        resolve();
      });

      imap.once("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });

      imap.connect();
    });

    return NextResponse.json({ message: "✅ Успешна IMAP връзка" });
  } catch (e: any) {
    return NextResponse.json({ error: `❌ ${e.message}` }, { status: 500 });
  }
}
