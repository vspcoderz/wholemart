"use client";

import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";

export default function SettingsTabs({
  initialTab,
  general,
  products,
  retailers,
}: {
  initialTab: "general" | "products" | "retailers";
  general: React.ReactNode;
  products: React.ReactNode;
  retailers: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display-xs font-semibold text-primary">Settings</h1>
      <Tabs defaultSelectedKey={initialTab}>
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
