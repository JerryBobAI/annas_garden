import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anna's Garden - 安娜的花园",
  description: "一个治愈风格的儿童学习网站，围绕学期目标，陪伴孩子快乐成长",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
