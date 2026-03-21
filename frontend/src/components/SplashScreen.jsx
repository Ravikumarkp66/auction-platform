"use client";

import Image from "next/image";

export default function SplashScreen({ src, title }) {
  const displayTitle = title || "Dr. G Parameshwar Cup";
  const displaySrc = src || "/splash-screen.png";
  return (
    <div className="fixed inset-0 bg-[#0a0f18] flex items-center justify-center overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.15)_0%,_transparent_70%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-[100px]"></div>
      
      {/* Content */}
      {/* Waiting for Broadcast Message (Centered & Responsive) */}
      <div className="relative z-20 flex flex-col items-center gap-6 w-full px-4 text-center">
        <div className="flex items-center gap-3 md:gap-5 bg-black/40 backdrop-blur-3xl px-6 md:px-10 py-4 md:py-5 rounded-xl md:rounded-full border border-white/20 shadow-2xl animate-pulse">
          <div className="relative flex h-2.5 w-2.5 md:h-3.5 md:w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3.5 md:w-3.5 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] md:text-[20px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-white whitespace-nowrap leading-none">Waiting for Broadcast</span>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes zoomIn {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }
        
        .animate-zoomIn {
          animation: zoomIn 1.2s ease forwards;
        }
      `}</style>
    </div>
  );
}
