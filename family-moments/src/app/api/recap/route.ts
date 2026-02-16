import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWeeklyRecap, seedDemoData } from "@/lib/store";

// GET /api/recap - get weekly family recap
export async function GET() {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = (session.user as any).familyId;
  const recap = getWeeklyRecap(familyId);
  return NextResponse.json({ recap });
}
