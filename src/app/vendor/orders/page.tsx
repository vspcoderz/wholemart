import { redirect } from "next/navigation";

export const metadata = { title: "My orders" };

export default function VendorOrdersRedirect() {
  redirect("/vendor/transactions?tab=orders");
}
