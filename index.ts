// ============================================================
// PROXY SUPABASE — groq-proxy/index.ts
// Coloque este arquivo em: supabase/functions/groq-proxy/index.ts
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY = Deno.env.get("GROQ_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Responde preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Recebe { system, messages, max_tokens } do script.js
    const { system, messages, max_tokens } = await req.json();

    // Monta array no formato OpenAI/Groq
    const groqMessages = [];
    if (system) {
      groqMessages.push({ role: "system", content: system });
    }
    for (const m of messages) {
      groqMessages.push({ role: m.role, content: m.content });
    }

    const response = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: max_tokens || 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: { message: data.error?.message || "Erro no Groq" } }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retorna no mesmo formato que o script.js espera
    const text = data.choices?.[0]?.message?.content || "";
    return new Response(
      JSON.stringify({ content: [{ type: "text", text }] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
