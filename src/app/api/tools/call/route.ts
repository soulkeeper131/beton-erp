// /src/app/api/tools/call/route.ts
// Execute a tool on behalf of an external AI client (authenticated via API key)

import { NextResponse } from "next/server";
import { getTool, agentTools } from "@/lib/agent/tools";
import { resolveApiKey } from "@/lib/api-keys";
import { toolAllowedForRole } from "@/lib/agent/permissions";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Преди: ключ от средата минаваше middleware-а, но тук се търсеше само в базата (403),
  // а ключ от базата middleware-ът спираше (401) — инструментите не работеха с нищо.
  const caller = resolveApiKey(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized — използвайте Bearer <api-key>" }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tool: toolName, params } = body || {};
  if (!toolName) {
    return NextResponse.json({ error: "Полето 'tool' е задължително" }, { status: 400 });
  }

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json({
      error: `Инструментът '${toolName}' не съществува`,
      availableTools: agentTools.filter(t => toolAllowedForRole(t.name, caller.role)).map(t => t.name),
    }, { status: 400 });
  }
  // Ключ от базата = права на мениджър: без потребители, настройки и backup
  if (!toolAllowedForRole(tool.name, caller.role)) {
    return NextResponse.json({ error: "Този инструмент изисква администраторски ключ" }, { status: 403 });
  }

  try {
    const result = await tool.handler(params || {}, 0); // userId 0 = system/api
    if (tool.requiresConfirmation) {
      auditLog({ action: "UPDATE", entityType: "api_tool", changes: { tool: tool.name, key: caller.name } });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
