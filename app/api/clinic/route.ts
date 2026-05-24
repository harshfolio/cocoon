import { NextResponse } from "next/server";
import { getClinicRecords } from "@/lib/store/call-store";

export async function GET() {
  return NextResponse.json({ records: getClinicRecords() });
}
