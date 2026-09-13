import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/vendor");

  return <AdminShell>{children}</AdminShell>;
}
