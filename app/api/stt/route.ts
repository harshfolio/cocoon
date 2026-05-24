import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio file provided in request." },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const contentType = audioBlob.type || "audio/webm;codecs=opus";

    console.log(`[STT] Received audio: size=${audioBlob.size} bytes, type=${contentType}`);

    // nova-3 natively supports Hindi (language=hi) including Hinglish code-switching.
    // detect_language=true lets Deepgram handle English phrases seamlessly within Hindi speech.
    // smart_format=true enables punctuation + number normalisation (punctuate is included, no need to set separately).
    const deepgramUrl = [
      "https://api.deepgram.com/v1/listen",
      "?model=nova-3",
      "&language=hi",           // Hindi; nova-3 handles Hinglish (code-switching) natively
      "&detect_language=true",  // gracefully handles English phrases in Hindi speech
      "&smart_format=true",     // punctuation + entity normalisation (includes punctuate)
      "&filler_words=false"     // strip um/uh from transcripts
    ].join("");

    const response = await fetch(deepgramUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: `Token ${apiKey}`
      },
      body: arrayBuffer
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[STT] Deepgram error ${response.status}:`, responseText);
      return NextResponse.json(
        { error: `Deepgram transcription failed (${response.status}): ${responseText}` },
        { status: 500 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[STT] Failed to parse Deepgram JSON response:", responseText);
      return NextResponse.json(
        { error: "Invalid JSON from Deepgram" },
        { status: 500 }
      );
    }

    const result = data as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    const transcript =
      result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    console.log(`[STT] Transcript: "${transcript}" (${transcript.length} chars)`);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[STT] Unexpected route error:", error);
    const message = error instanceof Error ? error.message : "Unknown STT error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

