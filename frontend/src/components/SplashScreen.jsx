"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#0a0f18] flex items-center justify-center overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.15)_0%,_transparent_70%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,_rgba(251,191,36,0.2)_0%,_transparent_70%)] blur-[100px]"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center animate-zoomIn">
        <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto mb-8">
          <Image
            src="/splash-screen.png"
            alt="Dr. G Parameshwar Cup"
            fill
            className="object-contain drop-shadow-[0_0_40px_rgba(251,191,36,0.5)]"
            unoptimized
            priority
          />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-amber-400 uppercase tracking-[0.2em] drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
          Dr. G Parameshwar Cup
        </h1>
        <p className="text-amber-300/60 text-lg mt-2 font-bold uppercase tracking-[0.3em]">
          2026
        </p>
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
