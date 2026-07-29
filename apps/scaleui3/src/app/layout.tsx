import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { DevTools } from '@proto/devtools/react';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Scale UI 3 Prototypes',
  description: 'Interactive design prototype.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <DevTools appId="scaleui3">{children}</DevTools>
      </body>
    </html>
  );
}
