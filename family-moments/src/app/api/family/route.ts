import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createFamily,
  createUser,
  getFamilyByInviteCode,
  getFamilyMembers,
  getFamilyById,
  seedDemoData,
} from "@/lib/store";

// GET /api/family - get current user's family + members
export async function GET() {
  await seedDemoData();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = (session.user as any).familyId;
  const family = getFamilyById(familyId);
  if (!family) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }
  const members = getFamilyMembers(familyId).map((m) => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    isPet: m.isPet,
  }));
  return NextResponse.json({ family, members });
}

// POST /api/family - create a family OR join one
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, name, email, password, avatar, familyName, inviteCode, isPet, caretakerId } = body;

  if (action === "create") {
    const family = createFamily(familyName || "My Family");
    const user = await createUser(name, email, password, family.id, avatar || "👤");
    return NextResponse.json({
      family,
      user: { id: user.id, name: user.name, email: user.email },
    });
  }

  if (action === "join") {
    const family = getFamilyByInviteCode(inviteCode);
    if (!family) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
    }
    const user = await createUser(
      name,
      email,
      password,
      family.id,
      avatar || "👤",
      isPet || false,
      caretakerId
    );
    return NextResponse.json({
      family,
      user: { id: user.id, name: user.name, email: user.email },
    });
  }

  // Add pet to family
  if (action === "add-pet") {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const familyId = (session.user as any).familyId;
    const userId = (session.user as any).userId;
    const petEmail = `${name.toLowerCase().replace(/\s/g, "")}@pet.family`;
    const user = await createUser(
      name,
      petEmail,
      "pet-password",
      familyId,
      avatar || "🐕",
      true,
      caretakerId || userId
    );
    return NextResponse.json({
      user: { id: user.id, name: user.name, avatar: user.avatar, isPet: true },
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
