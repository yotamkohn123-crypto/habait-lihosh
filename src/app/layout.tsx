import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/bottom-nav";
import ServiceWorkerRegister from "@/components/service-worker-register";
import { IdentityProvider } from "@/lib/identity-context";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "הבית של ליהוש",
  description: "אפליקציית הבית המשותפת שלנו - תקציב, קניות, מטלות ופתקים",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ליהוש",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1f6f5c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full`}>
      <body className="h-full antialiased">
        <ServiceWorkerRegister />
        <div className="min-h-screen w-full bg-[#F0EDE6] flex justify-center">
          <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-background border-x border-stone-200/50 shadow-2xl">
            <IdentityProvider>
              <main className="flex-1">{children}</main>
              <BottomNav />
            </IdentityProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
