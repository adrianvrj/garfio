import type { Metadata, Viewport } from "next";
import { Anton, Libre_Franklin, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { ActivityStrip } from "@/components/ActivityStrip";
import { Footer, MainnetBanner } from "@/components/Footer";
import "./globals.css";

// The paper's three voices: Anton shouts the headlines, Newsreader tells the story,
// Franklin (the newspaper gothic) sets kickers, bylines and the market tables.
const anton = Anton({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-anton" });
const newsreader = Newsreader({ style: ["normal", "italic"], subsets: ["latin", "latin-ext"], axes: ["opsz"], variable: "--font-newsreader" });
const franklin = Libre_Franklin({ subsets: ["latin", "latin-ext"], variable: "--font-franklin" });

export const metadata: Metadata = {
  // Absolute URLs for the share cards; set NEXT_PUBLIC_SITE_URL to the deployed origin.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "The Hooks Daily · Memecoins respaldadas por bonos",
  description: "Launchpad en Stellar donde cada memecoin guarda su reserva en un activo real tokenizado.",
};

/** The phone's browser chrome takes the paper's color. */
export const viewport: Viewport = {
  themeColor: "#f2ede4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${anton.variable} ${newsreader.variable} ${franklin.variable}`}>
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
