"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";

export default function SettingsTabs({
  general,
  products,
  retailers,
}: {
  general: React.ReactNode;
  products: React.ReactNode;
  retailers: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("tab");
  const tab = raw === "products" || raw === "retailers" ? raw : "general";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display-xs font-semibold text-primary">Settings</h1>
      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) => {
          const p = new URLSearchParams(searchParams.toString());
          if (k === "general") p.delete("tab");
          else p.set("tab", String(k));
          router.replace(`${pathname}?${p.toString()}`, { scroll: false });
        }}
      >
        <TabList type="underline" size="md">
          <Tab id="general" label="General" />
          <Tab id="products" label="Products" />
          <Tab id="retailers" label="Retailers" />
        </TabList>
        <TabPanel id="general">{general}</TabPanel>
        <TabPanel id="products">{products}</TabPanel>
        <TabPanel id="retailers">{retailers}</TabPanel>
      </Tabs>
    </div>
  );
}
