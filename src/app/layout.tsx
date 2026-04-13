import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DbInitializer from "@/components/DbInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ポケカ管理アプリ",
  description: "ポケモンカードの在庫・価格管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <DbInitializer>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
              {children}
            </div>
          </main>
        </DbInitializer>
      </body>
    </html>
  );
}
