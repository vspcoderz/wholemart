import { redirect } from "next/navigation";

export const metadata = { title: "Products" };

export default function AdminProductsRedirect() {
  redirect("/admin/settings?tab=products");
}
