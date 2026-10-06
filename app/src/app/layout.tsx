import type { Metadata, Viewport } from "next";
import { Anton, Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { ActivityStrip } from "@/components/ActivityStrip";
import { Footer, MainnetBanner } from "@/components/Footer";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const familjen = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-familjen" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  // Absolute URLs for the share cards; set NEXT_PUBLIC_SITE_URL to the deployed origin.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Garfio · Memecoins respaldadas por RWAs",
  description: "Launchpad en Stellar donde cada memecoin guarda su reserva en un activo real tokenizado.",
};

/** The phone's browser chrome takes the page background, in light and dark. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${anton.variable} ${familjen.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>
          <MainnetBanner />
          <Suspense>
            <Header />
          </Suspense>
          <ActivityStrip />
          <main className="wrap">{children}</main>
          <div className="wrap">
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
