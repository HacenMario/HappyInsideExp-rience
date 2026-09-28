import type { Metadata, Viewport } from "next";
import { Cairo, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const outfit = Outfit({
  variable: "--font-sans-custom",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const cairo = Cairo({
  variable: "--font-arabic-custom",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Happy inside expérience | مخيم الأخصائيين النفسيين في الجزائر",
  description:
    "مخيم يجمع بين التطوير المهني والعناية بالنفس لأخصائيي الجزائر في مختلف الولايات — 4 أيام و5 ليالٍ من التعلّم والاستمتاع والتبادل. Camp alliant développement professionnel et soin de soi pour les psychologues de toute l'Algérie.",
  keywords: [
    "Happy inside expérience",
    "مخيم أخصائيي نفسية",
    "الجزائر",
    "psychologues Algérie",
    "camp psychologue Algérie",
    "تطوير مهني",
    "développement professionnel",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/logo.png", type: "image/png", sizes: "1024x1024" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Happy Inside",
  },
  openGraph: {
    title: "Happy inside expérience",
    description: "نتعلّم، نستمتع، نتبادل، ونعود بطاقة أكبر",
    images: ["/images/hero.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${outfit.variable} ${cairo.variable} antialiased bg-background text-foreground`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
