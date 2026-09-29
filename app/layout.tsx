import type { Metadata, Viewport } from 'next';

import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'TesterPay',
  description: 'Send, request, and split money with the people you actually hang out with.',
};

export const viewport: Viewport = {
  themeColor: '#008CFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
