import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const ogTitle = "Anna's Garden - 安娜的花园";
const ogDescription =
  "AI 花园精灵陪伴式学习：探索、任务、创造三种模式，花园可视化成长，家长 AI 质性报告。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Anna's Garden - 安娜的花园 | AI 原生儿童教育",
  description:
    "让孩子在 AI 花园精灵陪伴下，通过探索、任务和创造学语文、数学、英语。基础技能在故事里自然发生，好奇心不被刷题杀死。",
  manifest: "/manifest.json",
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    type: "website",
    locale: "zh_CN",
    siteName: "Anna's Garden",
    url: siteUrl,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Anna's Garden - 安娜的花园",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: "AI 原生儿童教育平台 — 花园精灵陪你探索、创造、成长",
    images: ["/opengraph-image"],
  },
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
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
