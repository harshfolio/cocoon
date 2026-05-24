import { NextRequest } from "next/server";
import { streamSpeech } from "@/lib/silk/client";
import { extractTone, buildMulberryDescription } from "@/lib/silk/build-prompt";

type SilkApiRequest = {
  text: string;          // raw LLM output, may contain [tone] prefix
  languageLabel: string;
  voiceModel: "muga" | "mulberry";
};

export async function POST(request: NextRequest) {
  let body: SilkApiRequest;
  try {
    body = (await request.json()) as SilkApiRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { text, languageLabel, voiceModel } = body;
  const { tone, cleanText } = extractTone(text);

  console.log(`[Silk] model=${voiceModel} tone=${tone} text="${cleanText.slice(0, 80)}"`);

  try {
    let silkRes: Response;

    if (voiceModel === "mulberry") {
      const description = buildMulberryDescription(languageLabel, tone);
      silkRes = await streamSpeech({ model: "mulberry", text: cleanText, description, temperature: 0.7 });
    } else {
      silkRes = await streamSpeech({ model: "muga", text: `[${tone}] ${cleanText}`, temperature: 0.7 });
    }

    // Pipe Silk's response body directly to the browser — no server-side buffering.
    // This means the browser starts receiving audio bytes within ~100-200ms
    // instead of waiting for the full file to be synthesised and transferred.
    return new Response(silkRes.body, {
      status: 200,
      headers: {
        "Content-Type": silkRes.headers.get("Content-Type") ?? "audio/wav",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
        "X-Silk-Tone": tone,
      },
    });
  } catch (err) {
    console.error("[Silk] error:", err);
    const message = err instanceof Error ? err.message : "Unknown Silk error";
    return new Response(JSON.stringify({ error: message, textFallback: text }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
