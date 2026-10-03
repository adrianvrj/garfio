import type { Metadata } from "next";
import { Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { ActivityStrip } from "@/components/ActivityStrip";
import { DemoControls } from "@/components/DemoControls";
import "./globals.css";

const familjen = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-familjen" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Garfio · Memecoins respaldadas por RWAs",
  description: "Launchpad en Stellar donde cada memecoin guarda su reserva en un activo real tokenizado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${familjen.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>
          <Suspense>
            <Header />
          </Suspense>
          <ActivityStrip />
          <main className="wrap">{children}</main>
          <Suspense>
            <DemoControls />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
