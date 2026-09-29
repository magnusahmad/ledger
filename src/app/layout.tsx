import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Noto_Sans_TC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });
const tc = Noto_Sans_TC({ weight: ["400", "500", "700"], variable: "--font-noto-tc", display: "swap", preload: false });
const sc = Noto_Sans_SC({ weight: ["400", "500", "700"], variable: "--font-noto-sc", display: "swap", preload: false });

export const metadata: Metadata = { title: "Harbourline Desk", description: "Company secretarial work, handled." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${tc.variable} ${sc.variable}`}>
      <body>{children}</body>
    </html>
  );
}
