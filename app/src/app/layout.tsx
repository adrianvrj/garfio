import type { Metadata } from "next";
import { Anton, Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Tape } from "@/components/Tape";
import { DemoControls } from "@/components/DemoControls";
import "./globals.css";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const familjen = Familjen_Grotesk({ subsets: ["latin"], variable: "--font-familjen" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Garfio · Memecoins respaldadas por RWAs",
  description: "Launchpad en Stellar donde cada memecoin guarda su reserva en un activo real tokenizado.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${anton.variable} ${familjen.variable} ${jetbrains.variable}`}>
      <body>
        <Providers>
          <Tape />
          <div className="wrap">
            <Header />
            {children}
          </div>
          <Suspense>
            <DemoControls />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
