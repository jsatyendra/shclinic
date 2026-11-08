import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authOptions, findUserById, updateUserPassword } from "../../../../lib/auth";
import { passwordChangeSchema } from "../../../../lib/validation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = passwordChangeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid password details" },
        { status: 400 },
      );
    }

    const user = findUserById(userId);
    if (!user || !user.is_active) {
      return NextResponse.json({ error: "Unable to update password" }, { status: 400 });
    }

    const currentPasswordValid = await bcrypt.compare(
      result.data.currentPassword,
      user.password_hash,
    );

    if (!currentPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    if (result.data.currentPassword === result.data.newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(result.data.newPassword, 12);
    const updateResult = updateUserPassword(userId, passwordHash);

    if (updateResult.changes !== 1) {
      return NextResponse.json({ error: "Unable to update password" }, { status: 400 });
    }

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password update failed:", error);
    return NextResponse.json({ error: "Unable to update password" }, { status: 500 });
  }
}