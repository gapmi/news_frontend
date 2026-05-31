import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { to: "/topics", label: "Topics" },
  { to: "/articles", label: "Articles" },
  { to: "/lineage", label: "Lineage" },
  { to: "/about", label: "About" },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/topics" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-card text-sm font-semibold">
              AN
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold sm:text-base">
                aggregator-news.com
              </div>
              <div className="text-xs text-muted-foreground">
                Semantic news navigation
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/admin"
              className="rounded-md border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Admin
            </Link>
          </div>
        </div>

        <div className="border-t md:hidden">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.to ||
                (item.to === "/topics" && location.pathname.startsWith("/topics/"));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
                    isActive
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100vh-140px)] w-full max-w-7xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="text-sm font-semibold">aggregator-news.com</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Unified workspace for topic browsing, article discovery, semantic
              clustering, and lineage analysis.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Navigate
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/topics" className="text-muted-foreground hover:text-foreground">
                Topics
              </Link>
              <Link to="/articles" className="text-muted-foreground hover:text-foreground">
                Articles
              </Link>
              <Link to="/lineage" className="text-muted-foreground hover:text-foreground">
                Lineage
              </Link>
              <Link to="/about" className="text-muted-foreground hover:text-foreground">
                About
              </Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              System
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                Admin
              </Link>
              <Link to="/admin/login" className="text-muted-foreground hover:text-foreground">
                Admin login
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}