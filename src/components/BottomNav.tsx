"use client";

import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { Home, ShoppingCart, ReceiptLong, Person } from "@mui/icons-material";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useLang, type StringKey } from "@/lib/i18n";
import Badge from "@mui/material/Badge";

const items: { key: StringKey; value: string; icon: typeof Home; cart?: boolean }[] = [
  { key: "order", value: "/vendor", icon: Home },
  { key: "cart", value: "/vendor/cart", icon: ShoppingCart, cart: true },
  { key: "orders", value: "/vendor/orders", icon: ReceiptLong },
  { key: "profile", value: "/vendor/profile", icon: Person },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { items: cart } = useCart();
  const { t } = useLang();
  const cartCount = cart.filter((i) => i.quantity > 0).length;

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        pb: "env(safe-area-inset-bottom)",
        zIndex: 1000,
      }}
      elevation={3}
    >
      <BottomNavigation
        value={pathname}
        onChange={(_, v: string) => router.push(v)}
        showLabels
      >
        {items.map((it) => (
          <BottomNavigationAction
            key={it.value}
            label={t(it.key)}
            value={it.value}
            icon={
              it.cart ? (
                <Badge badgeContent={cartCount} color="primary">
                  <it.icon />
                </Badge>
              ) : (
                <it.icon />
              )
            }
            sx={{ minHeight: 56 }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
