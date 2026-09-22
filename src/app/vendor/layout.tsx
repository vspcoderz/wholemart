import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings, getWindowState } from "@/lib/window";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { orderItems, orders } from "@/db/schema";
import WindowBanner from "@/components/WindowBanner";
import BottomNav from "@/components/BottomNav";
import { CartProvider } from "@/components/cart/CartProvider";
import { LangProvider } from "@/lib/i18n";
import type { CartItemInput } from "@/lib/actions/orders";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "VENDOR") redirect("/admin");

  const [win, cfg] = await Promise.all([getWindowState(), getSettings()]);

  // Hydrate cart from any order already placed for the current window
  const existing = (
    await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, session.user.id),
          eq(orders.windowDate, win.windowDate),
        ),
      )
      .limit(1)
  )[0];
  let initialItems: CartItemInput[] = [];
  if (existing) {
    const rows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, existing.id));
    initialItems = rows
      .filter((r) => r.productId !== null)
      .map((r) => ({
        productId: r.productId as number,
        quantity: Number(r.quantity),
      }));
  }

  return (
    <LangProvider defaultLang={cfg.language}>
      <CartProvider initialItems={initialItems}>
        <div className="min-h-dvh pb-20">
          <div className="mx-auto w-full max-w-xl px-3 pt-2 sm:px-4">
            <WindowBanner
              open={win.open}
              closingSoon={win.closingSoon}
              closesAt={win.closesAt?.toISOString() ?? null}
              opensAt={win.opensAt?.toISOString() ?? null}
              startMinutes={cfg.windowStartMinutes}
              endMinutes={cfg.windowEndMinutes}
              deliveryNote={cfg.deliveryNote}
              windowDate={win.windowDate}
            />
          </div>
          <div className="mx-auto w-full max-w-xl px-3 pt-1 sm:px-4">
            {children}
          </div>
        </div>
        <BottomNav />
      </CartProvider>
    </LangProvider>
  );
}
