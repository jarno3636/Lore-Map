import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://toby-atlas.vercel.app').replace(
  /\/+$/,
  '',
);

const shareImageUrl = `${appUrl}/api/tobyworld/share-image?v=5`;

const miniAppEmbed = {
  version: '1',
  imageUrl: shareImageUrl,
  button: {
    title: 'Enter Tobyworld',
    action: {
      type: 'launch_frame',
      name: 'Tobyworld Atlas',
      url: appUrl,
      splashImageUrl: `${appUrl}/images/atlas/toby-pond-guardian.png`,
      splashBackgroundColor: '#07171f',
    },
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Tobyworld Atlas',
    template: '%s · Tobyworld Atlas',
  },
  description: 'Enter the pond. Follow the wheel. Reveal your Tobyworld role.',
  applicationName: 'Tobyworld Atlas',
  icons: {
    icon: '/images/atlas/toby-pond-guardian.png',
    apple: '/images/atlas/toby-pond-guardian.png',
  },
  openGraph: {
    title: 'Tobyworld Atlas',
    description: 'Enter the pond. Follow the wheel. Reveal your Tobyworld role.',
    type: 'website',
    url: appUrl,
    siteName: 'Tobyworld Atlas',
    images: [
      {
        url: shareImageUrl,
        width: 1200,
        height: 800,
        alt: 'Tobyworld Atlas — The pond remembers.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tobyworld Atlas',
    description: 'Enter the pond. Follow the wheel. Reveal your Tobyworld role.',
    images: [shareImageUrl],
  },
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    'fc:frame': JSON.stringify(miniAppEmbed),
  },
};

export const viewport: Viewport = {
  themeColor: '#07171f',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
