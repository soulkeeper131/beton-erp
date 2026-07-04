/* eslint-disable @typescript-eslint/no-explicit-any */
import Imap from "node-imap";
import { simpleParser } from "mailparser";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface FetchedEmail {
  uid: number;
  subject: string;
  from: string;
  date: Date;
  text: string;
  attachments: EmailAttachment[];
}

export async function fetchUnreadInvoices(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  folder: string;
}): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false },
    });

    const results: FetchedEmail[] = [];

    imap.once("ready", () => {
      imap.openBox(config.folder || "INBOX", false, (err: any) => {
        if (err) {
          imap.end();
          reject(err);
          return;
        }

        imap.search(["UNSEEN"], (err: any, uids: any[]) => {
          if (err || !uids.length) {
            imap.end();
            resolve([]);
            return;
          }

          // Limit to last 10 unread emails
          const toFetch = uids.slice(-10);

          const fetch = imap.fetch(toFetch, { bodies: "", struct: true });
          let count = 0;

          fetch.on("message", (msg: any) => {
            let body = "";
            let uid = 0;

            msg.on("body", (stream: any) => {
              stream.on("data", (chunk: Buffer) => {
                body += chunk.toString("utf8");
              });
            });

            msg.once("attributes", (attrs: any) => {
              uid = attrs.uid;
              msg.once("end", async () => {
                try {
                  const parsed = await simpleParser(body);
                  const attachments: EmailAttachment[] = [];
                  if (parsed.attachments) {
                    for (const att of parsed.attachments) {
                      attachments.push({
                        filename: att.filename || "unknown",
                        contentType: att.contentType,
                        content: att.content,
                      });
                    }
                  }
                  results.push({
                    uid,
                    subject: parsed.subject || "",
                    from: parsed.from?.text || "",
                    date: parsed.date || new Date(),
                    text: parsed.text || "",
                    attachments,
                  });
                } catch {
                  // skip unparseable emails
                }
                count++;
                if (count === toFetch.length) {
                  imap.end();
                  resolve(results);
                }
              });
            });
          });

          fetch.once("error", (err: any) => {
            imap.end();
            reject(err);
          });
        });
      });
    });

    imap.once("error", reject);

    const timeout = setTimeout(() => {
      imap.destroy();
      reject(new Error("IMAP timeout"));
    }, 30000);

    imap.once("end", () => clearTimeout(timeout));

    imap.connect();
  });
}
