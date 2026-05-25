import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "미래창업지원단 자금 관리 대시보드",
  description: "연세대학교 미래창업지원단 창업팀 예산 현황 및 자금 사용 내역 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased light">
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <ToastProvider>
          <div className="min-h-screen flex flex-col md:flex-row w-full">
            {/* Persistent Navigation Sidebar */}
            <Suspense fallback={<div className="w-64 bg-white hidden md:block border-r border-zinc-200" />}>
              <Sidebar />
            </Suspense>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 md:pl-64 pt-16 md:pt-0">
              <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {children}
              </div>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
