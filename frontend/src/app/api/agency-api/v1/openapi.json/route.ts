import { NextResponse } from "next/server";
import { agencyApiOpenapiSpec } from "@/lib/agencyApiOpenapi";

export async function GET() {
  return NextResponse.json(agencyApiOpenapiSpec);
}
