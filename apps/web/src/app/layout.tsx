import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "../styles/tokens.css";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { WatchlistProvider } from "../lib/watchlist-context";
import { Nav } from "../components/nav";

export const metadata: Metadata = {
  title: "FootBoxd",
  description: "Letterboxd du sport",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900;1,62..125,400..700&family=Martian+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <WatchlistProvider>
              <Nav />
              <main>{children}</main>
            </WatchlistProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
