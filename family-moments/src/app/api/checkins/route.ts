import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCheckIn,
  getCheckInsByFamily,
  getCheckInsByUser,
  seedDemoData,
  getUserById,
} from "@/lib/store";

// GET /api/checkins?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = (session.user as any).familyId;
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const userId = req.nextUrl.searchParams.get("userId") || undefined;

  let checkins;
  if (userId) {
    checkins = await getCheckInsByUser(userId, 30);
  } else {
    checkins = await getCheckInsByFamily(familyId, date);
  }

  // Enrich with user info
  const enriched = await Promise.all(
    checkins.map(async (c) => {
      const user = await getUserById(c.userId);
      return {
        ...c,
        userName: user?.name || "Unknown",
        userAvatar: user?.avatar || "\u{1F464}",
        userIsPet: user?.isPet || false,
      };
    })
  );

  return NextResponse.json({ checkins: enriched });
}

// POST /api/checkins - create a check-in
export async function POST(req: NextRequest) {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    emotion,
    quadrant,
    emoji,
    location,
    withWhom,
    activity,
    photoUrl,
    videoUrl,
    voiceNoteUrl,
    onBehalfOf,
  } = body;

  const userId = onBehalfOf || (session.user as any).userId;

  const checkin = await createCheckIn({
    userId,
    emotion,
    quadrant,
    emoji,
    location,
    withWhom: withWhom || [],
    activity,
    photoUrl,
    videoUrl,
    voiceNoteUrl,
  });

  return NextResponse.json({ checkin });
}
