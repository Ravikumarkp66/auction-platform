"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Zap, Trophy, Users, User } from 'lucide-react';
import { isApplicationRoute } from '../lib/applicationRoutes';

const TABS = [
  {
    name: 'Home',
    icon: Home,
    path: '/mobile',
    color: '#a78bfa',       // violet
    glow: 'rgba(167,139,250,0.35)',
    gradient: 'from-violet-500 to-violet-600',
  },
  {
    name: 'Live',
    icon: Zap,
    path: '/auctions',
    color: '#f87171',       // red — live feel
    glow: 'rgba(248,113,113,0.35)',
    gradient: 'from-red-500 to-orange-500',
    badge: true,            // pulsing live badge
  },
  {
    name: 'Auctions',
    icon: Trophy,
    path: '/auctions',
    color: '#fbbf24',       // gold
    glow: 'rgba(251,191,36,0.35)',
    gradient: 'from-yellow-400 to-amber-500',
  },
  {
    name: 'Teams',
    icon: Users,
    path: '/teams',
    color: '#34d399',       // emerald
    glow: 'rgba(52,211,153,0.35)',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    name: 'Profile',
    icon: User,
    path: '/login',
    color: '#60a5fa',       // blue
    glow: 'rgba(96,165,250,0.35)',
    gradient: 'from-blue-400 to-indigo-500',
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  // Hide on admin / auction / overlay routes
  const hidden =
    pathname === '/auction' ||
    pathname === '/live-auction' ||
    pathname === '/overlay' ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/team/') ||
    isApplicationRoute(pathname);

  // Auto-hide on scroll down, reveal on scroll up
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 50) { setVisible(true); return; }
      setVisible(y < lastY);
      setLastY(y);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  return (
    <AnimatePresence>
      {visible && !hidden && (
        <motion.div
          key="bottom-nav"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[200] md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Top edge glow */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-600/40 to-transparent" />

          {/* Nav Container */}
          <div
            className="flex items-center justify-around px-2 py-2"
            style={{
              background: 'rgba(5, 8, 22, 0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {TABS.map((tab) => {
              const isActive =
                pathname === tab.path ||
                (tab.path !== '/mobile' && pathname?.startsWith(tab.path));

              return (
                <TabItem
                  key={tab.name}
                  tab={tab}
                  isActive={isActive}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabItem({ tab, isActive }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.path}
      id={`bottom-nav-${tab.name.toLowerCase()}`}
      aria-label={tab.name}
      className="relative flex flex-col items-center justify-center gap-[3px] flex-1 py-1.5 min-h-[52px] group select-none"
    >
      {/* Active pill background */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="active-pill"
            className="absolute inset-x-2 inset-y-0.5 rounded-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{
              background: `radial-gradient(ellipse at center, ${tab.glow}, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Icon wrapper */}
      <motion.div
        animate={isActive ? { scale: 1.12, y: -2 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 18, stiffness: 350 }}
        className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl"
        style={
          isActive
            ? {
                background: `linear-gradient(135deg, ${tab.color}22, ${tab.color}11)`,
                boxShadow: `0 0 14px ${tab.glow}`,
                border: `1px solid ${tab.color}30`,
              }
            : {}
        }
      >
        <Icon
          size={20}
          style={{
            color: isActive ? tab.color : 'rgba(148,163,184,0.7)',
            filter: isActive ? `drop-shadow(0 0 6px ${tab.color})` : 'none',
            transition: 'all 0.25s ease',
            strokeWidth: isActive ? 2.5 : 1.75,
          }}
        />

        {/* Live pulse badge */}
        {tab.badge && (
          <span className="absolute -top-1 -right-1 flex h-[9px] w-[9px]">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: tab.color }}
            />
            <span
              className="relative inline-flex rounded-full h-[9px] w-[9px]"
              style={{ background: tab.color }}
            />
          </span>
        )}
      </motion.div>

      {/* Label */}
      <motion.span
        animate={isActive ? { opacity: 1 } : { opacity: 0.45 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: isActive ? tab.color : 'rgba(148,163,184,0.6)' }}
      >
        {tab.name}
      </motion.span>

      {/* Bottom dot indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="active-dot"
            className="absolute bottom-[3px] w-1 h-1 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            style={{
              background: tab.color,
              boxShadow: `0 0 8px ${tab.color}`,
            }}
          />
        )}
      </AnimatePresence>
    </Link>
  );
}
