import { redirect } from "next/navigation";

export const metadata = { title: "My account" };

export default function VendorAccountRedirect() {
  redirect("/vendor/transactions?tab=account");
}
