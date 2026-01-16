import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LayoutClient from "@/components/layout/LayoutClient";
import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://rileydrcelik.com";

export const metadata: Metadata = {
  title: {
    default: "Riley Drcelik",
    template: "%s | Riley Drcelik",
  },
  description: "Portfolio of Riley Drcelik - Artist, Photographer, Musician, and Developer",
  keywords: ["Riley Drcelik", "portfolio", "artist", "photographer", "musician", "developer", "artwork", "photography", "music", "projects"],
  authors: [{ name: "Riley Drcelik" }],
  creator: "Riley Drcelik",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Riley Drcelik",
    title: "Riley Drcelik",
    description: "Portfolio of Riley Drcelik - Artist, Photographer, Musician, and Developer",
  },
  twitter: {
    card: "summary_large_image",
    title: "Riley Drcelik",
    description: "Portfolio of Riley Drcelik - Artist, Photographer, Musician, and Developer",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// JSON-LD WebSite schema for Google sitelinks
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Riley Drcelik",
  url: siteUrl,
  description: "Portfolio of Riley Drcelik - Artist, Photographer, Musician, and Developer",
  author: {
    "@type": "Person",
    name: "Riley Drcelik",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LayoutClient>
            {children}
          </LayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}

