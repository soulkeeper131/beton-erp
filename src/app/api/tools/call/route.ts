// /src/app/api/tools/call/route.ts
// Execute a tool on behalf of an external AI client (authenticated via API key)

import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { getTool } from "@/lib/agent/tools";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth: Bearer token
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized — използвайте Bearer <api-key>" }, { status: 401 });
  }

  const key = authHeader.slice(7);
  const apiKey = db.select().from(apiKeys).where(eq(apiKeys.key, key)).get();
  if (!apiKey || !apiKey.active) {
    return NextResponse.json({ error: "Invalid or inactive API key" }, { status: 403 });
  }

  // Parse request
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool: toolName, params } = body;
  if (!toolName) {
    return NextResponse.json({ error: "Полето 'tool' е задължително" }, { status: 400 });
  }

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json({
      error: `Инструментът '${toolName}' не съществува`,
      availableTools: (await import("@/lib/agent/tools")).agentTools.map(t => t.name),
    }, { status: 400 });
  }

  try {
    const result = await tool.handler(params || {}, 0); // userId 0 = system/api
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
