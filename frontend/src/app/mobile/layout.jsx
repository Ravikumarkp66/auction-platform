import React from 'react';
import '../../globals.css';

export const metadata = {
  title: 'LCE Mobile',
  description: 'Premium Cricket Auction Experience',
};

export default function MobileLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[#030712] text-white overflow-x-hidden flex flex-col font-sans selection:bg-purple-500/30">
      {/* Fullscreen App Container */}
      <main className="flex-1 flex flex-col relative w-full h-full">
        {children}
      </main>

      {/* Safe Area Helpers */}
      <style jsx global>{`
        :root {
          --sat: env(safe-area-inset-top);
          --sar: env(safe-area-inset-right);
          --sab: env(safe-area-inset-bottom);
          --sal: env(safe-area-inset-left);
        }
        
        body {
          background-color: #030712 !important;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          overscroll-behavior: none;
        }

        /* Hide Scrollbars */
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Mobile specific spacing */
        .safe-top { padding-top: var(--sat); }
        .safe-bottom { padding-bottom: var(--sab); }
      `}</style>
    </div>
  );
}
