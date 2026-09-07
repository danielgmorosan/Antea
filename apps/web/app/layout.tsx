import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-archivo',
  display: 'swap',
});

/**
 * Absolute base for canonical and Open Graph URLs. Without it Next emits
 * relative hrefs, which crawlers and link unfurlers cannot resolve.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Antea — the atlas of lost cities',
    template: '%s · Antea',
  },
  description:
    'Spin the globe, descend into low-poly reconstructions of historical cities, and travel through the eras that shaped them.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
