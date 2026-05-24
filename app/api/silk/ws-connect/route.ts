import { NextRequest } from "next/server";

// ─── Silk WS session mint ─────────────────────────────────────────────────────
//
// The browser must never see the raw Silk API key.
// This route mints a one-shot WebSocket session token from Silk's server,
// then returns { ws_url, token } to the client.
//
// The browser then connects directly to Silk's WS — the audio bytes never
// pass through our server, giving us true sub-100ms first-chunk latency.

const SILK_BASE = process.env.SILK_BASE_URL ?? "https://silk-api.rumik.ai";

type MintRequest = {
  model: "muga" | "mulberry";
  text: string; // hint for Silk session routing (not the final text)
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.SILK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "SILK_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: MintRequest;
  try {
    body = (await request.json()) as MintRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(`${SILK_BASE}/v1/tts/ws-connect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: body.model, text: body.text }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Silk WS mint] failed:", err);
    return new Response(JSON.stringify({ error: `Silk WS mint failed: ${err}` }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = await res.json() as { ws_url: string; token: string };
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
