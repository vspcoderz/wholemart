"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";

/** Vendor changes their own password (must prove the current one). */
export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
) {
  const session = await auth();
  if (!session || session.user.role !== "VENDOR") {
    return { ok: false as const, error: "Not signed in." };
  }
  if (!newPassword || newPassword.length < 6) {
    return { ok: false as const, error: "TOO_SHORT" };
  }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) return { ok: false as const, error: "Not signed in." };

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return { ok: false as const, error: "WRONG_CURRENT" };

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(newPassword, 10) })
    .where(eq(users.id, session.user.id));
  return { ok: true as const };
}
