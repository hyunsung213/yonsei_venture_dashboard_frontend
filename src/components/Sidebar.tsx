"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Menu, X, Rocket, Beaker, MapPin } from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    const handle = setTimeout(() => {
      setIsOpen(false);
    }, 0);
    return () => clearTimeout(handle);
  }, [pathname]);

  const currentCategory = searchParams.get("category") || "all";

  const navItems = [
    {
      name: "전체",
      href: "/",
      category: "all",
      icon: LayoutDashboard,
    },
    {
      name: "시리즈 & 혁신형",
      href: "/?category=series-innovation",
      category: "series-innovation",
      icon: Rocket,
    },
    {
      name: "일반형 (LAB)",
      href: "/?category=lab",
      category: "lab",
      icon: Beaker,
    },
    {
      name: "로컬 (LOCAL)",
      href: "/?category=local",
      category: "local",
      icon: MapPin,
    },
  ];

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200 text-zinc-900 fixed top-0 left-0 right-0 z-40 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Image
            src="/yonsei_logo.png"
            alt="연세 로고"
            width={28}
            height={28}
            className="object-contain shrink-0"
          />
          <span className="text-[#002060] text-sm font-bold tracking-tight">
            YONSEI 미래창업지원단 자금관리
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 transition-colors"
          aria-label="Toggle Menu"
          id="mobile-menu-toggle"
        >
          {isOpen ? <X className="w-5 h-5 text-zinc-800" /> : <Menu className="w-5 h-5 text-zinc-800" />}
        </button>
      </header>

      {/* Backdrop for Mobile Sidebar */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-30 w-64 glass-sidebar px-6 py-8 flex flex-col text-zinc-900
          transition-transform duration-300 md:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:pt-8 pt-24
        `}
      >
        {/* Logo / Title */}
        <div className="flex items-center gap-3 px-2 mb-8 hidden md:flex">
          <div className="p-1 rounded-xl border border-zinc-200 bg-white shrink-0">
            <Image
              src="/yonsei_logo.png"
              alt="연세 로고"
              width={42}
              height={42}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-[#002060]">
              연세
              <span className="block mt-0.5 text-zinc-600 text-sm font-semibold">미래창업지원단</span>
            </h1>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === "/" && currentCategory === item.category;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-[#002060]/5 text-[#002060] border border-[#002060]/10 font-semibold"
                      : "text-zinc-500 hover:text-[#002060] hover:bg-zinc-50 border border-transparent"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#002060]" : "text-zinc-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="mt-auto px-4 py-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-500">
          <p className="font-medium text-zinc-700">미래창업지원단</p>
          <p className="mt-1 text-zinc-400">실무자 및 관리자 전용 웹</p>
          <div className="flex items-center gap-1.5 mt-3 text-zinc-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>시스템 정상 동작 중</span>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
