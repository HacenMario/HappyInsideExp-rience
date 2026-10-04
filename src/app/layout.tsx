import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { FONT_SCALE_BOOTSTRAP } from "@/lib/font-scale";

/*
 * Fonts are SELF-HOSTED (public/fonts/ + @font-face in globals.css).
 * next/font/google was removed: it fetches Google Fonts during the build,
 * which crashes `next build` in offline/restricted builders (Railway,
 * Docker, some CI) with the Turbopack error
 * "next/font/google queries have exactly one entry".
 * React 19 hoists the <link rel="preload"> elements below into <head>.
 */
const fontPreloads = [
  { href: "/fonts/cairo-arabic-wght-normal.woff2" },
  { href: "/fonts/cairo-latin-wght-normal.woff2" },
  { href: "/fonts/outfit-latin-wght-normal.woff2" },
];

export const metadata: Metadata = {
  title: "Happy inside experience | مخيم الأخصائيين النفسيين في الجزائر",
  description:
    "مخيم يجمع بين التطوير المهني والعناية بالنفس لأخصائيي الجزائر في مختلف الولايات — 4 أيام و5 ليالٍ من التعلّم والاستمتاع والتبادل. Camp alliant développement professionnel et soin de soi pour les psychologues de toute l'Algérie.",
  keywords: [
    "Happy inside experience",
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
    title: "Happy inside experience",
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
      <head>
        {/* Task 21 — restore the saved text size BEFORE hydration (no flash) */}
        <script id="hiex-font-scale" dangerouslySetInnerHTML={{ __html: FONT_SCALE_BOOTSTRAP }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        {fontPreloads.map((font) => (
          <link
            key={font.href}
            rel="preload"
            href={font.href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
