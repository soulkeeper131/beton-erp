// /src/app/api/agent/chat/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getToolsForLLM, getTool } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

async function getDeepSeekKey(): Promise<string> {
  // 1. Try company settings from DB
  try {
    const { companySettings } = await import("@/db/schema");
    const settings = db.select().from(companySettings).get();
    if (settings?.aiApiKey && settings.aiApiKey.length > 4) return settings.aiApiKey;
  } catch {}

  // 2. Try environment variable
  if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.length > 4) {
    return process.env.DEEPSEEK_API_KEY;
  }

  throw new Error("DeepSeek API ключът не е конфигуриран. Добавете го в /settings или в .env файла.");
}

async function callDeepSeek(messages: any[], tools: any[], apiKey: string) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API грешка (${response.status}): ${err}`);
  }

  return response.json();
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await req.json();
  const { message, sessionId } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message е задължително" }, { status: 400 });
  }

  try {
    const apiKey = await getDeepSeekKey();
    const tools = getToolsForLLM();

    // Load or create chat session
    let chatSessionId = sessionId;
    if (!chatSessionId) {
      const newSession = db.insert(chatSessions).values({
        userId,
        title: message.slice(0, 100),
      }).returning({ id: chatSessions.id }).get();
      chatSessionId = newSession.id;
    }

    // Load history (last 30 messages)
    const history = db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, chatSessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(30).all().reverse();

    // Save user message
    db.insert(chatMessages).values({
      sessionId: chatSessionId,
      role: "user",
      content: message,
    }).run();

    // Build messages array
    const llmMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId, name: m.toolName } : {}),
      })),
      { role: "user", content: message },
    ];

    // ─── Agent loop (LLM may call multiple tools) ───
    const MAX_LOOPS = 5;
    let loopCount = 0;
    let finalResponse = "";
    const steps: string[] = [];

    while (loopCount < MAX_LOOPS) {
      loopCount++;
      const result = await callDeepSeek(llmMessages, tools, apiKey);
      const choice = result.choices?.[0];
      if (!choice) throw new Error("Празен отговор от DeepSeek");

      const assistantMsg = choice.message;

      // If the model wants to call a tool
      if (assistantMsg.tool_calls?.length > 0) {
        // Add assistant's tool call to messages
        llmMessages.push({
          role: "assistant",
          content: assistantMsg.content || "",
          tool_calls: assistantMsg.tool_calls,
        });

        // Execute each tool call
        for (const tc of assistantMsg.tool_calls) {
          const tool = getTool(tc.function.name);
          if (!tool) {
            llmMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: `Инструментът '${tc.function.name}' не е намерен` }),
            });
            steps.push(`❌ Непознат инструмент: ${tc.function.name}`);
            continue;
          }

          // Check if confirmation is needed
          if (tool.requiresConfirmation) {
            // Return a special response asking for confirmation
            const summary = `Ще изпълня **${tc.function.name}**\n\`\`\`json\n${tc.function.arguments}\n\`\`\`\n\nПотвърждаваш ли?`;
            db.insert(chatMessages).values({
              sessionId: chatSessionId,
              role: "assistant",
              content: summary,
              metadata: JSON.stringify({ pendingTool: { name: tc.function.name, args: tc.function.arguments } }),
            }).run();
            return NextResponse.json({
              sessionId: chatSessionId,
              response: summary,
              needsConfirmation: true,
              pendingAction: { tool: tc.function.name, args: tc.function.arguments },
              steps,
            });
          }

          try {
            const args = JSON.parse(tc.function.arguments);
            const toolResult = await tool.handler(args, userId);
            const resultStr = JSON.stringify(toolResult);
            steps.push(`✅ ${tc.function.name}: ${resultStr.slice(0, 100)}...`);

            llmMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: resultStr,
            });

            // Save tool message
            db.insert(chatMessages).values({
              sessionId: chatSessionId,
              role: "assistant",
              content: resultStr,
              toolCallId: tc.id,
              toolName: tc.function.name,
            }).run();
          } catch (e: any) {
            const errStr = JSON.stringify({ error: e.message });
            llmMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: errStr,
            });
            steps.push(`❌ ${tc.function.name}: ${e.message}`);
          }
        }

        // Continue loop — LLM will process tool results
        continue;
      }

      // No tool calls — final response
      finalResponse = assistantMsg.content || "Готово.";
      break;
    }

    if (!finalResponse) {
      finalResponse = loopCount >= MAX_LOOPS
        ? "Достигнат е лимитът от стъпки. Моля, опитайте с по-конкретна заявка."
        : "Не успях да обработя заявката. Моля, опитайте отново.";
    }

    // Save assistant response
    db.insert(chatMessages).values({
      sessionId: chatSessionId,
      role: "assistant",
      content: finalResponse,
    }).run();

    return NextResponse.json({
      sessionId: chatSessionId,
      response: finalResponse,
      needsConfirmation: false,
      steps,
    });
  } catch (e: any) {
    console.error("Agent chat error:", e);
    return NextResponse.json({
      error: e.message || "Вътрешна грешка",
      response: `❌ Грешка: ${e.message}. Моля, опитайте отново или проверете конфигурацията на AI агента в /settings.`,
    }, { status: 500 });
  }
}

// GET — list sessions for the user
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = parseInt(session.user.id);
  const sessions = db.select({
    id: chatSessions.id,
    title: chatSessions.title,
    createdAt: chatSessions.createdAt,
    updatedAt: chatSessions.updatedAt,
  }).from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(20).all();

  return NextResponse.json(sessions);
}
