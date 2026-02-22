import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "100 Prisoners & Boxes – Animated Simulator",
  description: "Interactive simulator of the classic 100-prisoners problem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
