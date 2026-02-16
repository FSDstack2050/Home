import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addReaction, addComment, seedDemoData } from "@/lib/store";

// POST /api/reactions - add a reaction or comment
export async function POST(req: NextRequest) {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { checkinId, type, emoji, text } = body;
  const userId = (session.user as any).userId;

  if (type === "reaction") {
    const reaction = addReaction(checkinId, userId, emoji);
    if (!reaction) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    return NextResponse.json({ reaction });
  }

  if (type === "comment") {
    const comment = addComment(checkinId, userId, text);
    if (!comment) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    return NextResponse.json({ comment });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
