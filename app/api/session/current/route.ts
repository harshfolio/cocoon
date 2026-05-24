import { NextResponse } from "next/server";
import { getActiveCall } from "@/lib/store/call-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const call = getActiveCall();
  return NextResponse.json({ call }, {
    headers: { "Cache-Control": "no-store" }
  });
}
