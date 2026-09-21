import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/AppProviders";
import RegisterSW from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: {
    default: "Vaibhav Fruits — Wholesale Ordering",
    template: "%s · Vaibhav Fruits",
  },
  description:
    "B2B wholesale ordering for vegetables, English vegetables and fruits.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Vaibhav Fruits" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a7f37" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
        <RegisterSW />
      </body>
    </html>
  );
}
