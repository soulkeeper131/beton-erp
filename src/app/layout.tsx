import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Beton ERP",
  description: "ERP за строителен бизнес — бетонови услуги",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
// deploy trigger Thu Jun 25 10:52:01 UTC 2026
