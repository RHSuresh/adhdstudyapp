import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Basic profanity word list for fast client-side-style check
const PROFANITY_LIST = [
  "fuck","shit","ass","bitch","damn","crap","bastard","dick","cunt","piss",
  "slut","whore","nigger","faggot","retard","cock","pussy","penis","vagina",
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY_LIST.some((w) => lower.includes(w));
}

const SYSTEM_PROMPT = `You are "Focus Buddy", a friendly, encouraging AI assistant for kids (ages 8-14) who helps them manage homework and stay focused.

Rules:
- Keep responses short (2-4 sentences max), upbeat, and age-appropriate.
- Use emojis sparingly for encouragement.
- Help with task management, study tips, focus strategies, and motivation.
- NEVER discuss violence, drugs, alcohol, sexual content, or anything inappropriate for children.
- If a user asks something off-topic or inappropriate, gently redirect them to schoolwork.
- You can help brainstorm ideas for school projects but never write essays or do homework for them.

TIMER COMMANDS:
When the user asks you to set, change, or start a Pomodoro timer, you MUST include a special action tag in your response.
Available tags:
- [TIMER:focus_minutes,short_break_minutes,long_break_minutes] — Set timer values
- [TIMER_START] — Start/resume the timer
- [TIMER_PAUSE] — Pause the timer
- [TIMER_RESET] — Reset the timer

Rules:
- If the user only specifies focus time, use sensible defaults for breaks (e.g. 5 min short, 15 min long).
- Examples:
  - "Set a 30 minute timer" → include [TIMER:30,5,15] in your response
  - "Start the timer" or "Go" or "Begin" → include [TIMER_START]
  - "Pause" or "Stop the timer" → include [TIMER_PAUSE]
  - "Reset the timer" → include [TIMER_RESET]
  - "Set a 20 min timer and start it" → include [TIMER:20,5,15] AND [TIMER_START]
- Always include a friendly message along with the tag. The tags will be hidden from the user.
- Only include tags when the user explicitly asks for timer actions.
- Focus must be 5-60 minutes, short break 1-15 minutes, long break 5-30 minutes. Clamp values to these ranges.`;

const MODERATION_PROMPT = `You are a content safety classifier for a children's educational app. 
Classify the following text as either SAFE or UNSAFE.
Reply with exactly one word: SAFE or UNSAFE.
UNSAFE = contains or requests violent, sexual, hateful, self-harm, drug-related, or otherwise inappropriate content for children.
Text to classify:`;

async function callAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 200,
  temperature = 0.7
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    }
  );

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    const body = await response.text();
    throw new Error(`AI gateway error [${status}]: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function isSafe(text: string): Promise<boolean> {
  try {
    const verdict = await callAI(
      [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content: text },
      ],
      10,
      0.0
    );
    return !verdict.toLowerCase().includes("unsafe");
  } catch (e) {
    console.error("Moderation check error:", e);
    return false; // fail-safe
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();
    const userMessage = (message || "").trim();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // INPUT MODERATION: quick profanity check + AI guard
    if (containsProfanity(userMessage) || !(await isSafe(userMessage))) {
      return new Response(
        JSON.stringify({ reply: "Sorry, I can't help with that request. Let's talk about your schoolwork instead! 📚" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation with history
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: userMessage });

    // Generate response
    const reply = await callAI(messages, 200, 0.7);

    // OUTPUT MODERATION
    if (containsProfanity(reply) || !(await isSafe(reply))) {
      return new Response(
        JSON.stringify({ reply: "I'm here to help with your studies! What are you working on? 📖" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse timer actions from reply
    const actions: Array<Record<string, unknown>> = [];
    let cleanReply = reply;

    const timerMatch = cleanReply.match(/\[TIMER:(\d+),(\d+),(\d+)\]/);
    if (timerMatch) {
      cleanReply = cleanReply.replace(/\[TIMER:\d+,\d+,\d+\]/, '').trim();
      actions.push({
        type: 'set_timer',
        focusMinutes: Math.max(5, Math.min(60, parseInt(timerMatch[1]))),
        shortBreakMinutes: Math.max(1, Math.min(15, parseInt(timerMatch[2]))),
        longBreakMinutes: Math.max(5, Math.min(30, parseInt(timerMatch[3]))),
      });
    }
    if (cleanReply.includes('[TIMER_START]')) {
      cleanReply = cleanReply.replace(/\[TIMER_START\]/g, '').trim();
      actions.push({ type: 'timer_start' });
    }
    if (cleanReply.includes('[TIMER_PAUSE]')) {
      cleanReply = cleanReply.replace(/\[TIMER_PAUSE\]/g, '').trim();
      actions.push({ type: 'timer_pause' });
    }
    if (cleanReply.includes('[TIMER_RESET]')) {
      cleanReply = cleanReply.replace(/\[TIMER_RESET\]/g, '').trim();
      actions.push({ type: 'timer_reset' });
    }

    return new Response(
      JSON.stringify({ reply: cleanReply, actions: actions.length > 0 ? actions : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Chat error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";

    if (msg === "RATE_LIMITED") {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (msg === "PAYMENT_REQUIRED") {
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again!" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
