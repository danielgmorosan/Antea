import type { Metadata } from 'next';
import { Archivo, Fraunces } from 'next/font/google';
import { resolveSiteUrl } from '@/lib/site';
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

export const metadata: Metadata = {
  // Absolute base for canonical and Open Graph URLs. Without it Next emits
  // relative hrefs, which crawlers and link unfurlers cannot resolve.
  metadataBase: new URL(resolveSiteUrl()),
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
