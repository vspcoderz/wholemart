"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  BankNote02,
  ClockRewind,
  DotsHorizontal,
  HomeLine,
  LogOut01,
  Moon01,
  Printer,
  ReceiptCheck,
  Settings01,
  ShoppingBag02,
  Sun,
} from "@untitledui/icons";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import type { NavItemDividerType, NavItemType } from "@/components/application/app-navigation/config";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { useColorMode } from "@/components/AppProviders";
import { APP_NAME } from "@/lib/brand";
import { cx } from "@/utils/cx";

const NAV: (NavItemType | NavItemDividerType)[] = [
  { label: "Statistics", href: "/admin", icon: HomeLine },
  {
    label: "Reports",
    href: "/admin/orders",
    icon: ClockRewind,
    items: [
      { label: "Orders", href: "/admin/orders" },
      { label: "Outstanding", href: "/admin/orders?tab=outstanding" },
    ],
  },
  { label: "Billing", href: "/admin/billing", icon: ReceiptCheck },
  { label: "Purchase", href: "/admin/purchase", icon: ShoppingBag02 },
  { label: "Printing", href: "/admin/printing", icon: Printer },
  { label: "Accounting", href: "/admin/accounting", icon: BankNote02 },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings01,
    items: [
      { label: "General", href: "/admin/settings" },
      { label: "Products", href: "/admin/settings?tab=products" },
      { label: "Retailers", href: "/admin/settings?tab=retailers" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-white shadow-xs">
        <ShoppingBag02 className="size-5" />
      </span>
      <span className="truncate text-md font-semibold text-primary">{APP_NAME}</span>
    </div>
  );
}

function ThemeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useColorMode();
  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className={cx(
        "flex cursor-pointer items-center justify-center rounded-lg p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2",
        className,
      )}
    >
      {dark ? <Sun className="size-5" /> : <Moon01 className="size-5" />}
    </button>
  );
}

function SignOutItem({ onDone }: { onDone?: () => void }) {
  return (
    <NavItemBase
      type="link"
      href="/login"
      icon={LogOut01}
      onClick={(e) => {
        e.preventDefault();
        onDone?.();
        signOut({ redirectTo: "/login" });
      }}
    >
      Sign out
    </NavItemBase>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const tab = searchParams.get("tab");
  const activeUrl = pathname + (tab ? `?tab=${tab}` : "");

  // Bottom bar stays thumb-friendly: core tabs + a More sheet for the rest.
  const mobileTabs = [
    { label: "Statistics", href: "/admin", Icon: HomeLine },
    { label: "Reports", href: "/admin/orders", Icon: ClockRewind },
    { label: "Billing", href: "/admin/billing", Icon: ReceiptCheck },
    { label: "Printing", href: "/admin/printing", Icon: Printer },
  ];
  const currentMobile =
    mobileTabs.find((t) => isActive(pathname, t.href))?.href ??
    (pathname.startsWith("/admin/orders") ? "/admin/orders" : null);
  const moreSelected =
    !currentMobile &&
    ["/admin/purchase", "/admin/accounting", "/admin/settings"].some((h) =>
      isActive(pathname, h),
    );

  return (
    <div className="min-h-dvh bg-secondary lg:pl-70">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-70 flex-col border-r border-secondary bg-primary max-lg:hidden lg:flex">
        <div className="px-4 pt-4 lg:px-5 lg:pt-5">
          <BrandMark />
        </div>
        <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto">
          <NavList activeUrl={activeUrl} items={NAV} />
        </nav>
        <div className="mt-auto px-4 py-4 lg:px-5 lg:py-5">
          <ul className="flex flex-col">
            <li className="py-px">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <SignOutItem />
                </div>
                <ThemeToggle />
              </div>
            </li>
          </ul>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-secondary bg-primary px-4 lg:hidden">
        <BrandMark />
        <ThemeToggle />
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 pb-28 sm:px-6 lg:px-8 lg:py-6 lg:pb-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Admin"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-secondary bg-primary pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="grid grid-cols-5">
          {mobileTabs.map((t) => {
            const active = currentMobile === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold outline-focus-ring transition-colors focus-visible:outline-2",
                  active ? "text-brand-secondary" : "text-quaternary",
                )}
              >
                <t.Icon className="size-5" />
                {t.label === "Statistics" ? "Home" : t.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cx(
              "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold outline-focus-ring transition-colors focus-visible:outline-2",
              moreSelected ? "text-brand-secondary" : "text-quaternary",
            )}
          >
            <DotsHorizontal className="size-5" />
            More
          </button>
        </div>
      </nav>

      {/* Mobile More sheet */}
      <ModalOverlay isOpen={moreOpen} onOpenChange={setMoreOpen} isDismissable>
        <Modal className="sm:max-w-md">
          <Dialog className="p-2">
            <div
              onClick={(e) => {
                const a = (e.target as HTMLElement).closest("a");
                if (a) setMoreOpen(false);
              }}
            >
              <NavList activeUrl={activeUrl} items={NAV} className="pt-2" />
            </div>
            <div className="px-4 py-3">
              <SignOutItem onDone={() => setMoreOpen(false)} />
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
