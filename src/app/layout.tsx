import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import DbInitializer from "@/components/DbInitializer";
import AuthProvider from "@/components/AuthProvider";
import PwaRegistrar from "@/components/PwaRegistrar";

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
  manifest: "/pokeka-app/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ポケカ管理",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
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
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/pokeka-app/icon-192.png" />
      </head>
      <body className="min-h-full flex">
        <PwaRegistrar />
        <AuthProvider>
          <DbInitializer>
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
                {children}
              </div>
            </main>
          </DbInitializer>
        </AuthProvider>
      </body>
    </html>
  );
}
