import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cocoon",
  description: "Outbound AI voice follow-up assistant for care teams"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Inter Variable loaded via <link> in head — bypasses next/font constraint
    // so font-feature-settings cv01/ss03 and variable weight axis work correctly.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
