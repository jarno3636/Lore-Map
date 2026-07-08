import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://toby-atlas.vercel.app').replace(
  /\/+$/,
  '',
);

/*
  Bump this version whenever your social preview image changes.
  This helps Farcaster/X pull the fresh image instead of cached broken metadata.
*/
const assetVersion = 'v7';

const appName = 'Tobyworld Atlas';
const appDescription = 'Enter the pond. Follow the wheel. Reveal your Tobyworld role.';

const appIconUrl = `${appUrl}/miniapp/tobyworld-app-icon.png`;
const splashIconUrl = `${appUrl}/miniapp/tobyworld-splash-icon.png`;
const shareImageUrl = `${appUrl}/miniapp/tobyworld-og-image.png?${assetVersion}`;

const miniAppEmbed = {
  version: '1',
  imageUrl: shareImageUrl,
  button: {
    title: 'Enter Tobyworld',
    action: {
      type: 'launch_frame',
      name: appName,
      url: appUrl,
      splashImageUrl: splashIconUrl,
      splashBackgroundColor: '#07171f',
    },
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),

  title: {
    default: appName,
    template: `%s · ${appName}`,
  },

  description: appDescription,
  applicationName: appName,

  icons: {
    icon: [
      {
        url: '/miniapp/tobyworld-app-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/miniapp/tobyworld-app-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  },

  openGraph: {
    title: appName,
    description: appDescription,
    type: 'website',
    url: appUrl,
    siteName: appName,
    images: [
      {
        url: shareImageUrl,
        width: 1200,
        height: 630,
        alt: 'Tobyworld Atlas with the blue and white Toby frog.',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: appDescription,
    images: [
      {
        url: shareImageUrl,
        width: 1200,
        height: 630,
        alt: 'Tobyworld Atlas with the blue and white Toby frog.',
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: appName,
    statusBarStyle: 'black-translucent',
  },

  other: {
    /*
      Farcaster Mini App embed metadata.
      Keep both for compatibility.
    */
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
