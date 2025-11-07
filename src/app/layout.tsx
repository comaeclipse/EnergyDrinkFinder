import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Energy Drink Finder - Find Your Perfect Energy Drink",
  description: "Search for energy drinks and find nearby stores that carry them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
