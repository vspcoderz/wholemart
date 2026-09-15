import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSettings, getWindowState } from "@/lib/window";
import { db } from "@/db";
import { and, eq } from "drizzle-orm";
import { orderItems, orders } from "@/db/schema";
import { Box, Container } from "@mui/material";
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
        <Box sx={{ pb: 9, minHeight: "100dvh" }}>
          <Container maxWidth="sm" sx={{ pt: 2, px: { xs: 1.5, sm: 2 } }}>
            <WindowBanner
              open={win.open}
              closingSoon={win.closingSoon}
              closesAt={win.closesAt?.toISOString() ?? null}
              opensAt={win.opensAt?.toISOString() ?? null}
              startMinutes={cfg.windowStartMinutes}
              endMinutes={cfg.windowEndMinutes}
              deliveryNote={cfg.deliveryNote}
            />
          </Container>
          <Container maxWidth="sm" sx={{ px: { xs: 1.5, sm: 2 }, pt: 1 }}>
            {children}
          </Container>
        </Box>
        <BottomNav />
      </CartProvider>
    </LangProvider>
  );
}
