import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anna's Garden - 安娜的花园",
  description: "AI 原生儿童教育平台 — 花园精灵陪你探索、创造、成长",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "安娜的花园",
  },
  icons: {
    apple: "/images/icon-192.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFB300",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
