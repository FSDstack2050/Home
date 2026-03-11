import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStreakData, seedDemoData } from "@/lib/store";

// GET /api/streaks - get family streak data
export async function GET() {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = (session.user as any).familyId;
  const streaks = await getStreakData(familyId);
  return NextResponse.json({ streaks });
}
