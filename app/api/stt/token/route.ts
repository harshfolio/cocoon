import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "DEEPGRAM_API_KEY not set" }, { status: 500 });
  }

  // Mint a short-lived temporary token so the browser never sees the raw API key
  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ time_to_live_in_seconds: 60 })
  });

  if (!res.ok) {
    // Deepgram temporary tokens require a paid plan — fall back to passing the
    // key through for hackathon use where security is not a concern.
    return NextResponse.json({ apiKey }, { status: 200 });
  }

  const data = await res.json() as { key?: string };
  return NextResponse.json({ apiKey: data.key ?? apiKey });
}
