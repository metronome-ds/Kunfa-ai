import "./globals.css";

export const metadata = {
  title: "SITREP UAE — Situation Room",
  description: "Real-time UAE situation monitoring dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
