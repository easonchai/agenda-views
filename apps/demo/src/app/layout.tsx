import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import agendaData from "@/data/agenda.json";
import type { Agenda } from "agenda-views/headless";
import {
  eventName,
  eventShortName,
  formatDateRange,
  siteDescription,
  siteUrl,
  venueLocality,
  venueName,
} from "@/lib/site";
import "./globals.css";

const agenda = agendaData as Agenda;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const description = siteDescription(agenda);
const dateRange = formatDateRange(agenda);

export const metadata: Metadata = {
  // makes every relative URL below (canonical, OG image) absolute
  metadataBase: new URL(siteUrl),
  title: {
    default: `${eventName} — Programme`,
    template: `%s — ${eventShortName}`,
  },
  description,
  applicationName: `${eventShortName} Programme`,
  keywords: [
    eventName,
    eventShortName,
    "AI conference Malaysia",
    "conference schedule",
    "event agenda",
    "Kuala Lumpur tech event",
    ...agenda.stages.map((s) => s.name),
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: eventName,
    title: `${eventName} — Programme`,
    description,
    url: "/",
    locale: "en_MY",
  },
  twitter: {
    card: "summary_large_image",
    title: `${eventName} — Programme`,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  other: {
    // surfaces the dates to crawlers that read plain meta rather than JSON-LD
    "event:start_date": agenda.days[0]?.date ?? "",
    "event:location": `${venueName}, ${venueLocality}`,
    "event:dates": dateRange,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  // allow zoom — pinch-zoom is an accessibility requirement, not a nuisance
  maximumScale: 5,
  viewportFit: "cover",
};

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem("agenda-theme");
    const dark = stored ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* runs before paint so the theme never flashes */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <a
          href="#agenda"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[var(--color-brand)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to agenda
        </a>
        {children}
      </body>
    </html>
  );
}
