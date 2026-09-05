import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import GlobalDock from "@/components/GlobalDock";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "星迹智绘 StarTrace - 从第一笔开始学画画",
  description: "面向零基础绘画者的智能笔触拆解与渐进式绘画引导应用",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: '#F6F7FB',
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
          <main className="flex-1 flex flex-col pb-20 sm:pb-24">
            {children}
          </main>
          <GlobalDock />
        </AppProvider>
      </body>
    </html>
  );
}
