import { NextResponse } from "next/server";
import { resetPassword, validateResetToken } from "@/lib/store";

export async function POST(req: Request) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const entry = await validateResetToken(token);
  if (!entry) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  const success = await resetPassword(token, password);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Password has been reset successfully" });
}
