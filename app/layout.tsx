import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe Coding Workshop Enrollment",
  description: "Enroll for the Vibe Coding Workshop",
  openGraph: {
    title: "Vibe Coding Workshop Enrollment",
    description: "Enroll for the Vibe Coding Workshop",
    images: [{ url: "/og-card.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vibe Coding Workshop Enrollment",
    description: "Enroll for the Vibe Coding Workshop",
    images: ["/og-card.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
