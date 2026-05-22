import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import GlobalDock from "@/components/GlobalDock";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "星绘智愈 - AI 辅助油画创作",
  description: "让每个人都能画出大师级油画",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
  themeColor: '#FFFFFF',
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
