// /src/app/api/agent/chat/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getToolsForLLM, getTool } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function ensureTables() {
  try {
    db.run(sql.raw(`CREATE TABLE IF NOT EXISTS chat_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`));
    db.run(sql.raw(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_call_id TEXT,
      tool_name TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`));
  } catch {}
}

async function getDeepSeekKey(): Promise<string> {
  try {
    const { companySettings } = await import("@/db/schema");
    const settings = db.select().from(companySettings).get();
    if (settings?.aiApiKey && settings.aiApiKey.length > 4) return settings.aiApiKey;
  } catch {}
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 4) {
    return process.env.DEEPSEEK_API_KEY;
  }
  throw new Error("DeepSeek API ключът не е конфигуриран.");
}

async function callDeepSeekStream(messages: any[], tools: any[], apiKey: string): Promise<Response> {
  return fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat", messages, tools, tool_choice: "auto",
      temperature: 0.3, max_tokens: 2000,
      stream: true,
    }),
  });
}

export async function POST(req: Request) {
  ensureTables();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await req.json();
  const { message, sessionId, confirm, pendingAction } = body;

  // Handle confirmation flow (non-streaming)
  if (confirm === true && pendingAction) {
    return handleConfirmation(userId, sessionId, pendingAction);
  }

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message е задължително" }, { status: 400 });
  }

  try {
    const apiKey = await getDeepSeekKey();
    const tools = getToolsForLLM();

    // Load or create session
    let chatSessionId = sessionId;
    if (!chatSessionId) {
      const ns = db.insert(chatSessions).values({ userId, title: message.slice(0, 100) })
        .returning({ id: chatSessions.id }).get();
      chatSessionId = ns.id;
    }

    // Load history
    const history = db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, chatSessionId))
      .orderBy(desc(chatMessages.createdAt)).limit(30).all().reverse();

    // Save user message
    db.insert(chatMessages).values({ sessionId: chatSessionId, role: "user", content: message }).run();

    // Build messages
    const llmMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.role, content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId, name: m.toolName } : {}),
      })),
      { role: "user", content: message },
    ];

    // ─── Agent loop (non-streaming — execute tools first) ───
    const MAX_LOOPS = 5;
    let loopCount = 0;

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      // Use non-streaming for tool detection
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat", messages: llmMessages, tools,
          tool_choice: "auto", temperature: 0.3, max_tokens: 2000,
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek грешка ${res.status}`);

      const result = await res.json();
      const choice = result.choices?.[0];
      if (!choice) throw new Error("Празен отговор");

      const assistantMsg = choice.message;

      // Tool calls?
      if (assistantMsg.tool_calls?.length > 0) {
        llmMessages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls });

        for (const tc of assistantMsg.tool_calls) {
          const tool = getTool(tc.function.name);
          if (!tool) {
            llmMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: `Непознат инструмент: ${tc.function.name}` }) });
            continue;
          }

          if (tool.requiresConfirmation) {
            const summary = `Ще изпълня **${tc.function.name}**\n\`\`\`json\n${tc.function.arguments}\n\`\`\`\n\nПотвърждаваш ли?`;
            db.insert(chatMessages).values({
              sessionId: chatSessionId, role: "assistant", content: summary,
              metadata: JSON.stringify({ pendingTool: { name: tc.function.name, args: JSON.parse(tc.function.arguments) } }),
            }).run();
            return NextResponse.json({
              sessionId: chatSessionId, response: summary,
              needsConfirmation: true,
              pendingAction: { tool: tc.function.name, args: JSON.parse(tc.function.arguments) },
            });
          }

          try {
            const args = JSON.parse(tc.function.arguments);
            const toolResult = await tool.handler(args, userId);
            llmMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
            db.insert(chatMessages).values({ sessionId: chatSessionId, role: "assistant", content: JSON.stringify(toolResult), toolCallId: tc.id, toolName: tc.function.name }).run();
          } catch (e: any) {
            llmMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: e.message }) });
          }
        }
        continue;
      }

      // Final response — STREAM it
      const finalText = assistantMsg.content || "Готово.";
      return streamFinalResponse(chatSessionId, finalText, llmMessages, tools, apiKey);
    }

    return NextResponse.json({ sessionId: chatSessionId, response: "Достигнат лимит от стъпки.", needsConfirmation: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, response: `❌ ${e.message}` }, { status: 500 });
  }
}

// Stream the final DeepSeek response as SSE
async function streamFinalResponse(sessionId: number, initialText: string, messages: any[], tools: any[], apiKey: string) {
  const encoder = new TextEncoder();
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // If the model already returned full text (no tool calls needed), just send it
        if (initialText && initialText !== "Готово.") {
          fullContent = initialText;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: initialText })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
          db.insert(chatMessages).values({ sessionId, role: "assistant", content: fullContent }).run();
          controller.close();
          return;
        }

        // Otherwise stream from DeepSeek
        const dsRes = await callDeepSeekStream(messages, tools, apiKey);
        if (!dsRes.ok || !dsRes.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: "Грешка при streaming." })}\n\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
          controller.close();
          return;
        }

        const reader = dsRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch {}
          }
        }

        // Save final message
        if (fullContent) {
          db.insert(chatMessages).values({ sessionId, role: "assistant", content: fullContent }).run();
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
        controller.close();
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: `❌ ${e.message}` })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, sessionId })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Handle tool confirmation
async function handleConfirmation(userId: number, sessionId: number, pendingAction: { tool: string; args: any }) {
  try {
    const apiKey = await getDeepSeekKey();
    const tool = getTool(pendingAction.tool);
    if (!tool) return NextResponse.json({ error: "Инструментът не е намерен" }, { status: 400 });

    const result = await tool.handler(pendingAction.args, userId);
    const resultStr = JSON.stringify(result, null, 2);

    return NextResponse.json({
      sessionId,
      response: `✅ Изпълнено успешно!\n\`\`\`json\n${resultStr}\n\`\`\``,
      needsConfirmation: false,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, response: `❌ ${e.message}` }, { status: 500 });
  }
}

// GET — list sessions
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = parseInt(session.user.id);
  const sessions = db.select({ id: chatSessions.id, title: chatSessions.title, createdAt: chatSessions.createdAt, updatedAt: chatSessions.updatedAt })
    .from(chatSessions).where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt)).limit(20).all();
  return NextResponse.json(sessions);
}
