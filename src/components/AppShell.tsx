"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Visão do Time" },
  { href: "/projects", label: "Projetos" },
  { href: "/blip", label: "Busca Blip" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--macro-bg)] text-[var(--macro-text)]">
      <header className="border-b border-[var(--macro-border)] bg-[var(--macro-surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--macro-accent)] text-sm font-bold text-black">
              MB
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">macroBrain</p>
              <p className="text-xs text-[var(--macro-text-dim)]">Hub do time de Chatbot</p>
            </div>
          </div>

          <nav className="flex gap-1 rounded-xl border border-[var(--macro-border)] bg-[var(--macro-surface-elevated)] p-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--macro-accent)] text-black"
                      : "text-[var(--macro-text-muted)] hover:text-[var(--macro-text)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
