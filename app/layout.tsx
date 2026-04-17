import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClinicConfigProvider } from "@/contexts/ClinicConfigContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clinic Print Helper",
  description: "Fast appointment printing for clinic front desk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100`}
      >
        <ClinicConfigProvider>{children}</ClinicConfigProvider>
        {/* Hidden print area — populated by WebPrinterService before window.print() */}
        <div id="print-area" />
      </body>
    </html>
  );
}
