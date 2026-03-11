import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/store";
import { seedDemoData } from "@/lib/store";

export async function POST(req: Request) {
  await seedDemoData();

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const token = await createResetToken(email);

  // Always return success to avoid leaking whether an email exists
  // But include the token in the response for demo purposes (no real email service)
  return NextResponse.json({
    message: "If an account with that email exists, a reset link has been generated.",
    // In production, you'd send this via email instead of returning it
    ...(token ? { resetToken: token } : {}),
  });
}
