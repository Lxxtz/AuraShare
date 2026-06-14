import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuraShare | Premium File Sharing",
  description: "Secure, fast, and elegant file sharing with alphanumeric codes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
