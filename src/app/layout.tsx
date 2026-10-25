import type { Metadata } from "next";
import "./globals.css";
import "./night-ui.css";
import "./motion-ui.css";
import "./narrative-ui.css";
import "./scene-transition.css";
import { AppProvider } from "@/contexts/AppContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import AppContent from "@/components/AppContent";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "星迹智绘 StarTrace - 让灵感成为下一笔",
  description: "选择素材、安排画面，与自动笔触一起创作；也可以在自由画布中随心表达。",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: '#141414',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-white">
        <AppProvider>
          <AppContent>
            {children}
          </AppContent>
        </AppProvider>
      </body>
    </html>
  );
}
