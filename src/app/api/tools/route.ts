// /src/app/api/tools/route.ts
// Returns tool definitions in OpenAI function calling format for external AI clients

import { NextResponse } from "next/server";
import { getToolsForLLM, agentTools } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";

export async function GET() {
  const tools = getToolsForLLM();
  
  // Also include human-readable descriptions for each tool
  const descriptions = agentTools.map(t => ({
    name: t.name,
    description: t.description,
    requiresConfirmation: t.requiresConfirmation || false,
    parameters: t.parameters,
  }));

  return NextResponse.json({
    version: "1.0",
    platform: "Beton ERP",
    tools,
    descriptions,
    usage: {
      endpoint: "POST /api/tools/call",
      authentication: "Bearer <api-key>",
      example: {
        curl: 'curl -X POST https://beton.blv.bg/api/tools/call \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"tool":"list_sites","params":{}}\'',
      },
    },
  });
}
