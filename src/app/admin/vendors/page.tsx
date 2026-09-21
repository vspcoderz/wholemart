import { redirect } from "next/navigation";

export const metadata = { title: "Retailers" };

export default function AdminVendorsRedirect() {
  redirect("/admin/settings?tab=retailers");
}
