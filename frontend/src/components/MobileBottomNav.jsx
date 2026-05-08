"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Zap, Trophy, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Home', icon: Home, path: '/mobile' },
    { name: 'Live', icon: Zap, path: '/auctions' },
    { name: 'Leagues', icon: Trophy, path: '/tournaments' },
    { name: 'Profile', icon: User, path: '/login' }, // Using login for now
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-[100] px-4">
      <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-full py-2.5 px-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link key={tab.name} href={tab.path} className="relative flex-1 flex flex-col items-center gap-1 group">
              <div className={`p-2 rounded-2xl transition-all duration-300 relative ${isActive ? 'text-white' : 'text-slate-500 active:scale-90'}`}>
                <tab.icon className={`w-5 h-5 ${isActive ? 'fill-white/10' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full -z-10"
                  />
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {tab.name}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute -bottom-1.5 w-1 h-1 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
