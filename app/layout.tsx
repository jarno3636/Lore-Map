import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tobyworld — The Living Flywheel',
  description: 'An interactive lore atlas for the $TOBY ecosystem.',
  applicationName: 'Tobyworld',
  openGraph: {
    title: 'Tobyworld — The Living Flywheel',
    description: 'Plant stillness. Tend the world. Follow the runes.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#071019',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
