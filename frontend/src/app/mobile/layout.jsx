import React from 'react';
import '../globals.css'; // Fixed path: globals.css is one level up from mobile folder
import MobileAppStyles from './MobileAppStyles';

export const metadata = {
  title: 'LCE Mobile',
  description: 'Premium Cricket Auction Experience',
};

export default function MobileLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[#030712] text-white overflow-x-hidden flex flex-col font-sans selection:bg-purple-500/30">
      <MobileAppStyles />
      
      {/* Fullscreen App Container */}
      <main className="flex-1 flex flex-col relative w-full h-full">
        {children}
      </main>
    </div>
  );
}
