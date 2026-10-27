"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, Bug, Image, Images, Menu, Settings, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { HeaderActions } from "@/components/header-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import webConfig from "@/constants/common-env";
import { fetchThirdPartyApps, type ThirdPartyAppsSettings } from "@/lib/api";
import { getValidatedAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { clearStoredAuthSession, type StoredAuthSession } from "@/store/auth";

const adminNavItems = [
  { href: "/image", label: "Images", icon: Image },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/image-manager", label: "Gallery", icon: Images },
  { href: "/logs", label: "Logs", icon: Activity },
  { href: "/debug", label: "Debug", icon: Bug },
  { href: "/settings", label: "Settings", icon: Settings },
];

const userNavItems = [{ href: "/image", label: "Images", icon: Image }];

function buildThirdPartyHref(appUrl: string, baseUrl: string, apiKey: string) {
  const url = appUrl.trim();
  try {
    const target = new URL(url);
    target.searchParams.set("apiKey", apiKey);
    target.searchParams.set("baseUrl", baseUrl);
    return target.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}&baseUrl=${encodeURIComponent(baseUrl)}`;
  }
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null | undefined>(undefined);
  const [thirdPartyApps, setThirdPartyApps] = useState<ThirdPartyAppsSettings | null>(null);
  const [isCanvasDialogOpen, setIsCanvasDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (pathname === "/login") {
        if (!active) {
          return;
        }
        setSession(null);
        return;
      }

      const storedSession = await getValidatedAuthSession();
      if (!active) {
        return;
      }
      setSession(storedSession);
    };

    void load();
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;
    if (!session) {
      queueMicrotask(() => {
        if (active) setThirdPartyApps(null);
      });
      return () => { active = false; };
    }
    const load = async () => {
      try {
        const data = await fetchThirdPartyApps();
        if (active) {
          setThirdPartyApps(data.third_party_apps);
        }
      } catch {
        if (active) {
          setThirdPartyApps(null);
        }
      }
    };
    const reload = () => void load();

    void load();
    window.addEventListener("third-party-apps-updated", reload);
    return () => {
      active = false;
      window.removeEventListener("third-party-apps-updated", reload);
    };
  }, [session]);

  const handleLogout = async () => {
    await clearStoredAuthSession();
    router.replace("/login");
  };

  if (pathname === "/login" || session === undefined || !session) {
    return null;
  }

  const navItems = session.role === "admin" ? adminNavItems : userNavItems;
  const roleLabel = session.role === "admin" ? "Admin" : "User";
  const displayName = session.name.trim() || roleLabel;
  const baseUrl = webConfig.apiUrl.replace(/\/$/, "") || window.location.origin;
  const canvas = thirdPartyApps?.infinite_canvas;
  const canvasHref = canvas?.enabled && canvas.url.trim() ? buildThirdPartyHref(canvas.url, baseUrl, session.key) : "";
  const canvasDisplayHref = canvasHref ? decodeURIComponent(canvasHref) : "";

  const handleCanvasOpen = () => {
    if (!canvasHref) {
      return;
    }
    setIsCanvasDialogOpen(true);
  };

  const confirmCanvasOpen = () => {
    if (canvasHref) {
      window.open(canvasHref, "_blank", "noopener,noreferrer");
    }
    setIsCanvasDialogOpen(false);
  };

  return (
    <>
      <header className="border-b border-stone-200/70 dark:border-white/10">
        <div className="flex min-h-16 items-center justify-between gap-3 px-1 py-2 sm:px-2 lg:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-none lg:gap-3">
            <Sheet>
              <SheetTrigger className="inline-flex size-10 items-center justify-center rounded-xl border border-stone-200 bg-white/80 text-stone-700 transition hover:bg-white lg:hidden dark:border-white/10 dark:text-stone-200">
                <Menu className="size-5" />
                <span className="sr-only">Open navigation</span>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>chatgpt2api</SheetTitle>
                  <span className="text-xs text-stone-500 dark:text-stone-400">{roleLabel} · {displayName}</span>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  {canvasHref ? (
                    <SheetClose asChild>
                      <button
                        type="button"
                        className="flex items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white"
                        onClick={handleCanvasOpen}
                      >
                        Infinite canvas
                      </button>
                    </SheetClose>
                  ) : null}
                  {navItems.map((item) => {
                    const active = pathname === item.href;
                    const className = cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
                      active ? "bg-stone-950 text-white dark:bg-white dark:text-stone-950" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white",
                    );
                    return (
                      <SheetClose asChild key={item.href}>
                        <Link href={item.href} className={className} aria-current={active ? "page" : undefined}><item.icon className="size-4" aria-hidden="true" />{item.label}</Link>
                      </SheetClose>
                    );
                  })}
                </nav>
                <SheetFooter>
                  <button
                    type="button"
                    className="rounded-xl border border-stone-200 px-3 py-2.5 text-left text-sm font-medium text-stone-500 transition hover:text-stone-950 dark:border-white/10 dark:text-stone-300 dark:hover:text-white"
                    onClick={() => void handleLogout()}
                  >
                    Sign out
                  </button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Link
              href="/image"
              className="shrink-0 py-1 text-base font-bold tracking-tight text-stone-950 transition hover:text-stone-700 dark:text-stone-50 dark:hover:text-white"
            >
              chatgpt2api
            </Link>
            <HeaderActions className="ml-auto lg:hidden" showGithubText={false} />
          </div>
          <nav aria-label="Main navigation" className="hide-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex lg:justify-center">
            {canvasHref ? (
              <button
                type="button"
                onClick={handleCanvasOpen}
                className="shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-white/80 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
              >
                Infinite canvas
              </button>
            ) : null}
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-white text-stone-950 shadow-sm ring-1 ring-stone-200/70 dark:bg-white/10 dark:text-white dark:ring-white/10"
                      : "text-stone-500 hover:bg-white/70 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100",
                  )}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden shrink-0 items-center justify-end gap-3 lg:flex">
            <HeaderActions />
            <span className="hidden rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-500 dark:bg-white/8 dark:text-stone-300 xl:inline-block">
              {roleLabel} · {displayName}
            </span>
            <button
              type="button"
              className="py-1 text-xs text-stone-400 transition hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 sm:text-sm"
              onClick={() => void handleLogout()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Dialog open={isCanvasDialogOpen} onOpenChange={setIsCanvasDialogOpen}>
        <DialogContent showCloseButton={false} className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Open third-party app</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              This entry is for personal testing only; deploy locally for long-term use. The redirect URL includes this project&apos;s base URL and your current API key to pre-fill connection settings. Cancel and open the app manually if you prefer to enter them yourself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="text-xs font-medium text-stone-500">Full redirect URL</div>
            <div className="max-h-28 overflow-auto break-all rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs leading-5 text-stone-700">
              {canvasDisplayHref}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-xl border-stone-200 bg-white text-stone-700">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" className="rounded-xl bg-stone-950 text-white hover:bg-stone-800" onClick={confirmCanvasOpen}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
