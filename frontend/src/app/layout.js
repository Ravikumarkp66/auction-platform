import './globals.css';
import Navbar from '../components/Navbar';
import DynamicBackground from '../components/DynamicBackground';
import { LanguageProvider } from '../context/LanguageContext';
import AuthProvider from '../components/AuthProvider';

import { Inter, Noto_Sans_Kannada } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const noto = Noto_Sans_Kannada({ subsets: ['kannada'], weight: ['400', '700', '900'], variable: '--font-noto' });

export const metadata = {
  title: 'Lakshmish Cricket Events | Professional Cricket Commentary & Auctions',
  description: 'Book a professional cricket commentator and auctioneer for your next local tournament.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${noto.variable}`}>
      <body className="main-container text-slate-50 min-h-screen flex flex-col font-sans antialiased">
        <DynamicBackground />
        <AuthProvider>
          <LanguageProvider>
            <div className="app flex flex-col min-h-screen w-full">
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
            </div>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
