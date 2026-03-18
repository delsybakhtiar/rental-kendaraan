import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/footer";

const geistSans = localFont({
  variable: "--font-geist-sans",
  src: [
    {
      path: "../../public/fonts/geist-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/geist-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [
    {
      path: "../../public/fonts/geist-mono-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/geist-mono-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Car Rental Tracking System",
  description: "Real-time vehicle tracking and monitoring system with geofencing capabilities. Track your rental fleet with interactive maps and alerts.",
  keywords: ["Car Rental", "Tracking", "GPS", "Geofencing", "Fleet Management", "Next.js", "React"],
  authors: [{ name: "Car Rental Team" }],
  icons: {
    icon: "/car-icon.png",
  },
  openGraph: {
    title: "Car Rental Tracking System",
    description: "Real-time vehicle tracking with geofencing",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
