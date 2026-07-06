import './globals.css';

import { Inter, Noto_Sans_Kannada } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const noto = Noto_Sans_Kannada({ subsets: ['kannada'], weight: ['400', '700', '900'], variable: '--font-noto' });

export const metadata = {
  title: "We've Moved! — Lakshmish Cricket Events",
  description: 'Lakshmish Cricket Events has moved to a new website. Visit us at lakshmish-cricket-events.vercel.app for faster performance and new features.',
  openGraph: {
    type: 'website',
    title: "We've Moved! — Lakshmish Cricket Events",
    description: 'Visit our brand new website at lakshmish-cricket-events.vercel.app',
  },
};

export const viewport = {
  themeColor: '#06091a',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${noto.variable}`}>
      <head>
        <meta name="theme-color" content="#06091a" />
      </head>
      <body suppressHydrationWarning className="text-slate-50 min-h-screen font-sans antialiased bg-[#06091a] overflow-x-hidden">
        {/* Render children normally — page.js at "/" will show the redirect page.
            For all other routes, the middleware handles redirection to "/" */}
        {children}
      </body>
    </html>
  );
}
