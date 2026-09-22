"use client";

import { usePathname, useRouter } from "next/navigation";
import { FileCheck02, HomeLine, ShoppingCart02, User01 } from "@untitledui/icons";
import { useCart } from "@/components/cart/CartProvider";
import { useLang, type StringKey } from "@/lib/i18n";
import { cx } from "@/utils/cx";

const items: { key: StringKey; value: string; Icon: typeof HomeLine; cart?: boolean }[] = [
  { key: "order", value: "/vendor", Icon: HomeLine },
  { key: "cart", value: "/vendor/cart", Icon: ShoppingCart02, cart: true },
  { key: "transactions", value: "/vendor/transactions", Icon: FileCheck02 },
  { key: "profile", value: "/vendor/profile", Icon: User01 },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { items: cart } = useCart();
  const { t } = useLang();
  const cartCount = cart.filter((i) => i.quantity > 0).length;

  return (
    <nav
      aria-label="Vendor"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-secondary bg-primary pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {items.map((it) => {
          const active = pathname === it.value;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => router.push(it.value)}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold outline-focus-ring transition-colors focus-visible:outline-2",
                active ? "text-brand-secondary" : "text-quaternary",
              )}
            >
              <span className="relative">
                <it.Icon className="size-5" />
                {it.cart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-solid px-1 text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </span>
              {t(it.key)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
