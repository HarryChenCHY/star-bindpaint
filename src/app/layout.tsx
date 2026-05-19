import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";

export const metadata: Metadata = {
  title: "星绘智愈 - AI 辅助油画创作",
  description: "让每个人都能画出大师级油画",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white">
        <AppProvider>
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
