"use client";

import Image from "next/image";

export default function SplashScreen({ src, title }) {
  const displaySrc = src || "https://auction-platform-kp.s3.ap-south-1.amazonaws.com/static/space-bg.jpg";
  
  return (
    <div className="fixed inset-0 bg-[#0a0f18] flex items-center justify-center overflow-hidden z-[200]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={displaySrc} 
          className="w-full h-full object-cover opacity-60 scale-110 animate-zoomIn" 
          alt="Splash Background" 
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-[#0a0f18] opacity-80" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center gap-10 w-full px-4 text-center">
        {/* Animated Badge */}
        <div className="flex items-center gap-5 bg-black/60 backdrop-blur-3xl px-12 py-6 rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-pulse">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </div>
          <span className="text-[20px] font-black uppercase tracking-[0.6em] text-white whitespace-nowrap leading-none">Broadcast Starting</span>
        </div>

        {/* Title */}
        <div className="space-y-4">
           <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter italic drop-shadow-2xl">
             {title || "CRICKET AUCTION"}
           </h1>
           <div className="h-1.5 w-32 bg-violet-600 mx-auto rounded-full" />
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
