import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WhatsDis \u2014 Object Scanner 2003",
  description:
    "Point your camera at something. WhatsDis will identify it, at needless expense.",
  applicationName: "WhatsDis",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // The scanner window is a fixed full-height surface; letting the browser
  // rubber-band it drags the camera preview out of alignment.
  userScalable: false,
  themeColor: "#06256f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${vt323.variable} ${pressStart.variable}`}>
      <body>{children}</body>
    </html>
  );
}
