type SilkModel = "muga" | "mulberry";

type SilkRequest = {
  model: SilkModel;
  text: string;
  description?: string;
  speaker?: string;
  temperature?: number;
};

const SILK_BASE = process.env.SILK_BASE_URL ?? "https://silk-api.rumik.ai";

function getApiKey(): string {
  const apiKey = process.env.SILK_API_KEY;
  if (!apiKey) throw new Error("SILK_API_KEY is not set");
  return apiKey;
}

/**
 * Buffered synthesis — returns a complete Buffer.
 * Keep for server-side use where you need the full bytes (e.g. preload).
 */
export async function synthesizeSpeech(req: SilkRequest): Promise<Buffer> {
  const response = await fetchSilk(req);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Streaming synthesis — returns the raw Response so the caller can
 * pipe response.body directly to the browser without buffering on the server.
 */
export async function streamSpeech(req: SilkRequest): Promise<Response> {
  return fetchSilk(req);
}

async function fetchSilk(req: SilkRequest): Promise<Response> {
  const response = await fetch(`${SILK_BASE}/v1/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Silk TTS failed (${response.status}): ${body}`);
  }

  return response;
}
