import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const miniAppEmbed = {
  version: '1',
  imageUrl: `${appUrl}/miniapp/tobyworld-og-image.png`,
  button: {
    title: 'Enter Tobyworld',
    action: {
      type: 'launch_frame',
      name: 'Tobyworld Atlas',
      url: appUrl,
      splashImageUrl: `${appUrl}/miniapp/tobyworld-splash-icon.png`,
      splashBackgroundColor: '#07171f',
    },
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),

  title: {
    default: 'Tobyworld — The Living Flywheel',
    template: '%s · Tobyworld',
  },

  description: 'An interactive lore atlas for the $TOBY ecosystem.',
  applicationName: 'Tobyworld Atlas',

  icons: {
    icon: '/miniapp/tobyworld-app-icon.png',
    apple: '/miniapp/tobyworld-app-icon.png',
  },

  openGraph: {
    title: 'Tobyworld — The Living Flywheel',
    description: 'Plant stillness. Tend the world. Follow the runes.',
    type: 'website',
    url: appUrl,
    siteName: 'Tobyworld Atlas',
    images: [
      {
        url: '/miniapp/tobyworld-og-image.png',
        width: 1200,
        height: 630,
        alt: 'Cute blue Toby frog exploring a glowing Tobyworld atlas map.',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Tobyworld — The Living Flywheel',
    description: 'Plant stillness. Tend the world. Follow the runes.',
    images: ['/miniapp/tobyworld-og-image.png'],
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
