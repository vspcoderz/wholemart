import { eq } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Profile" };

export default async function VendorProfilePage() {
  const session = await auth();
  if (!session) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ProfileClient
      businessName={user?.businessName ?? ""}
      contactPerson={user?.contactPerson ?? null}
      phone={user?.phone ?? null}
      address={user?.address ?? null}
      email={user?.email ?? ""}
      signOutAction={doSignOut}
    />
  );
}
