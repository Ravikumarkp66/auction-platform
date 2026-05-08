"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function MobileLanding() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden min-h-dvh">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[40%] bg-purple-600/15 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full" />
      
      {/* Logo Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative mb-14"
      >
        <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-36 h-36 flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 80L75 45" stroke="#A855F7" strokeWidth="10" strokeLinecap="round" />
            <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="#A855F7" />
            <path d="M45 45L80 80" stroke="white" strokeWidth="10" strokeLinecap="round" />
            <circle cx="60" cy="60" r="10" fill="#FBBF24" />
          </svg>
        </div>
      </motion.div>

      {/* Text Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="text-center z-10 mb-16"
      >
        <h1 className="text-4xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-linear-to-b from-white to-gray-400 leading-tight">
          LAKSHMISH
          <span className="block text-lg font-bold tracking-[0.4em] text-purple-500 uppercase mt-2">
            Cricket Events
          </span>
        </h1>
        <div className="h-px w-12 bg-purple-500/50 mx-auto mb-4" />
        <p className="text-gray-400 text-lg font-medium max-w-[280px] mx-auto leading-relaxed">
          IPL Style Mobile <br /> 
          <span className="text-white">Auction Experience</span>
        </p>
      </motion.div>

      {/* Button Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="w-full max-w-[300px] z-10"
      >
        <Link href="/mobile/onboarding">
          <button className="w-full py-5 rounded-2xl font-black text-xl relative group overflow-hidden transition-all active:scale-[0.98] shadow-2xl shadow-purple-900/20">
            {/* Button Gradient Background */}
            <div className="absolute inset-0 bg-linear-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-indigo-500 transition-all" />
            
            {/* Glow Effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity blur-xl bg-purple-400/40" />
            
            <span className="relative z-10 flex items-center justify-center gap-3">
              Enter App
              <motion.svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </motion.svg>
            </span>
          </button>
        </Link>
      </motion.div>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-12 text-[10px] uppercase tracking-[0.3em] text-gray-600 font-black"
      >
        LCE • Premium Mobile Edition
      </motion.div>
    </div>
  );
}
