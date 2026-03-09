import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kunfa — Venture Intelligence",
  description: "AI-powered venture intelligence for the GCC",
  icons: [
    { rel: "icon", type: "image/png", sizes: "32x32", url: "/images/kunfa-icon-32.png" },
    { rel: "icon", type: "image/png", sizes: "16x16", url: "/images/kunfa-icon-16.png" },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/images/kunfa-apple-touch.png" },
  ],
  openGraph: {
    title: "Kunfa — Venture Intelligence",
    description: "AI-powered venture intelligence for the GCC",
    images: [{ url: "/images/kunfa-og.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
