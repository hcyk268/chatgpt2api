import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "ChatGPT Account Pool",
  description: "ChatGPT account pool management dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0ebe3" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className="antialiased"
        style={{
          fontFamily:
            '"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif',
        }}
      >
        <Toaster position="top-center" richColors offset={48} />
        <main className="min-h-screen overflow-x-clip bg-[radial-gradient(ellipse_at_top_left,_#fff_0%,_#f7f4ef_48%,_#f1ede7_100%)] px-3 pb-6 text-stone-900 transition-colors duration-300 dark:bg-[radial-gradient(ellipse_at_top_left,_#292522_0%,_#1c1917_48%,_#100e0d_100%)] dark:text-stone-100 sm:px-6 lg:px-8">
          <div className="mx-auto box-border flex min-h-screen max-w-[1440px] flex-col gap-4 pt-[env(safe-area-inset-top)] sm:gap-6">
            <TopNav />
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
