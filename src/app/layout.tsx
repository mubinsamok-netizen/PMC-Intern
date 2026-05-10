import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "PMC Intern Attendance",
  description: "Intern attendance platform for Pichayamongkol Construction",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={sarabun.variable}>{children}</body>
    </html>
  );
}
