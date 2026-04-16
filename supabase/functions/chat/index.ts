import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { buildContext } from "./context.ts"
import { TOOLS } from "./tools.ts"
import { SSEWriter, sseHeaders } from "./stream.ts"

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!anthropicKey) {
    return new Response("ANTHROPIC_API_KEY not configured", { status: 500 })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response("Missing authorization header", { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 })
  }

  let body: { conversation_id?: string; message: string; history?: Array<{ role: string; content: string }> }
  try {
    body = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  if (!body.message?.trim()) {
    return new Response("Message is required", { status: 400 })
  }

  const { systemPrompt } = await buildContext(supabase, user.id)

  const messages: Array<{ role: string; content: string }> = [
    ...(body.history || []),
    { role: "user", content: body.message },
  ]

  const sse = new SSEWriter()

  const streamToClient = async () => {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        sse.error(`Claude API error: ${response.status} ${errorText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        sse.error("No response body")
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let currentToolName = ""
      let currentToolInput = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue

          try {
            const event = JSON.parse(data)

            if (event.type === "content_block_start") {
              if (event.content_block?.type === "tool_use") {
                currentToolName = event.content_block.name
                currentToolInput = ""
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta?.type === "text_delta") {
                sse.write({ type: "text", content: event.delta.text })
              } else if (event.delta?.type === "input_json_delta") {
                currentToolInput += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolName) {
                try {
                  const params = JSON.parse(currentToolInput)
                  sse.write({ type: "tool_call", action: currentToolName, params })
                } catch {
                  sse.write({ type: "tool_call", action: currentToolName, params: {} })
                }
                currentToolName = ""
                currentToolInput = ""
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      sse.close()
    } catch (err) {
      sse.error(`Stream error: ${(err as Error).message}`)
    }
  }

  streamToClient()

  return new Response(sse.stream, { headers: sseHeaders() })
})
