import './globals.css';
import Navbar from '../components/Navbar';

import { LanguageProvider } from '../context/LanguageContext';
import AuthProvider from '../components/AuthProvider';

export const metadata = {
  title: 'AuctionPro | Professional Cricket Commentary & Auctions',
  description: 'Book a professional cricket commentator and auctioneer for your next local tournament.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="main-container text-slate-50 min-h-screen flex flex-col font-sans antialiased">
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
