import './globals.css';
import Navbar from '../components/Navbar';
import DynamicBackground from '../components/DynamicBackground';
import { LanguageProvider } from '../context/LanguageContext';
import AuthProvider from '../components/AuthProvider';


import { Inter, Noto_Sans_Kannada } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const noto = Noto_Sans_Kannada({ subsets: ['kannada'], weight: ['400', '700', '900'], variable: '--font-noto' });

export const metadata = {
  title: 'Lakshmish Cricket Events',
  description: 'Live Cricket Auction Platform with real-time bidding and tournament management',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LCE',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    title: 'Lakshmish Cricket Events',
    description: 'Live Cricket Auction Platform with real-time bidding',
  },
};

export const viewport = {
  themeColor: '#0b1020',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${noto.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#0b1020" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="main-container text-slate-50 min-h-screen flex flex-col font-sans antialiased">
        <DynamicBackground />
        <AuthProvider>

          <LanguageProvider>
            <div className="app flex flex-col min-h-screen w-full">
              <Navbar />
              <main className="grow">
                {children}
              </main>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
