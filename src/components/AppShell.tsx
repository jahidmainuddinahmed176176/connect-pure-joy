import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, Users, User } from "lucide-react";
import type { ReactNode } from "react";


const tabs = [
  { to: "/", label: "Feed", icon: Home },
  { to: "/chats", label: "Chats", icon: MessageCircle },
  { to: "/groups", label: "Groups", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();


  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          mix<span className="text-primary">.</span>
        </Link>
        <Link
          to="/profile"
          className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {tabs.map((t) => {
            const active =
              t.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                <span className="font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
