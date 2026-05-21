"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import AuthModal from './AuthModal';
import { API_URL, getMediaUrl } from '../lib/apiConfig';
import { isApplicationRoute } from '../lib/applicationRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Zap, Shield, LogIn } from 'lucide-react';

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasNotification, setHasNotification] = useState(true); // demo badge

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide navbar on specific routes
  if (
    pathname === '/auction' ||
    pathname === '/live-auction' ||
    pathname === '/overlay' ||
    pathname.startsWith('/sports/display') ||
    pathname.startsWith('/sports/live') ||
    pathname.startsWith('/live/mobile') ||
    pathname.startsWith('/team/') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/mobile') ||
    isApplicationRoute(pathname)
  ) {
    return null;
  }

  const isAdmin = session?.user?.role === 'admin';

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/auctions', label: 'Live Auction', isLive: true },
    ...(isAdmin ? [
      { href: '/services', label: 'Services' },
      { href: '/about', label: 'About' },
    ] : []),
  ];

  const isActive = (path) => pathname === path;

  return (
    <>
      {/* ── TOP NAVBAR ── */}
      <nav
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? 'bg-[#070B1A]/95 shadow-[0_4px_32px_rgba(0,0,0,0.5)] border-b border-white/[0.06]'
          : 'bg-[#070B1A]/80 border-b border-white/[0.06]'
          }`}
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] sm:h-[64px] flex items-center justify-between">

          {/* ── LEFT: Logo & Branding ── */}
          <Link href="/" className="flex items-center gap-3 group select-none">
            {/* Logo Mark */}
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <div className="absolute inset-0 bg-violet-600/25 rounded-xl blur-md group-hover:bg-violet-500/40 transition-all duration-500" />
              <svg className="relative w-10 h-10 drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M40 80L75 45" stroke="#A855F7" strokeWidth="10" strokeLinecap="round" />
                <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="#A855F7" />
                <path d="M45 45L80 80" stroke="white" strokeWidth="10" strokeLinecap="round" />
                <path d="M80 80L88 88" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
                <circle cx="60" cy="60" r="8" fill="#FBBF24" className="animate-pulse" />
                <circle cx="60" cy="60" r="12" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>
            </div>

            {/* Brand Text */}
            <div className="flex flex-col leading-none">
              <span className="text-[18px] sm:text-[20px] font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-violet-400 uppercase">
                LAKSHMISH
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.35em] uppercase text-violet-400/80 mt-[2px]">
                Cricket Events
              </span>
            </div>
          </Link>

          {/* ── CENTER: Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 group
                  ${link.isLive
                    ? 'text-red-400 hover:text-red-300'
                    : isActive(link.href)
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
              >
                {link.isLive && (
                  <span className="inline-flex items-center gap-1">
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    {link.label}
                  </span>
                )}
                {!link.isLive && link.label}

                {isActive(link.href) && !link.isLive && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* ── RIGHT: Action Icons ── */}
          <div className="flex items-center gap-2">

            {/* Admin Badge — desktop only */}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:shadow-[0_0_22px_rgba(251,191,36,0.65)] hover:scale-105 transition-all duration-200"
              >
                <Shield size={12} />
                Admin
              </Link>
            )}

            {/* Notification Button */}
            <button
              id="navbar-notification-btn"
              aria-label="Notifications"
              className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-violet-500/40 transition-all duration-200 active:scale-95"
              onClick={() => setHasNotification(false)}
            >
              <Bell size={18} className="text-slate-300" />
              {hasNotification && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              )}
            </button>

            {/* Profile / Sign-in Button */}
            <div className="relative">
              {session ? (
                <>
                  <button
                    id="navbar-profile-btn"
                    aria-label="Profile menu"
                    onClick={() => setProfileDropdownOpen(prev => !prev)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600/30 to-blue-600/20 border border-violet-500/30 hover:border-violet-400/60 hover:from-violet-600/50 transition-all duration-200 active:scale-95"
                  >
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt="profile"
                        className="w-7 h-7 rounded-lg object-cover"
                      />
                    ) : (
                      <User size={18} className="text-violet-300" />
                    )}
                  </button>

                  <AnimatePresence>
                    {profileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                        style={{
                          background: 'rgba(10, 14, 35, 0.95)',
                          backdropFilter: 'blur(20px)',
                        }}
                      >
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <p className="text-xs text-slate-400 truncate">Signed in as</p>
                          <p className="text-sm font-semibold text-white truncate mt-0.5">{session.user?.name || session.user?.email}</p>
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                              <Shield size={9} /> Admin
                            </span>
                          )}
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          {/* Language Switcher */}
                          <div className="px-3 py-2">
                            <p className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-widest">Language</p>
                            <div className="flex gap-1.5">
                              {['en', 'hi', 'kn'].map(lang => (
                                <button
                                  key={lang}
                                  onClick={() => { changeLanguage(lang); setProfileDropdownOpen(false); }}
                                  className={`flex-1 py-1 rounded-md text-[11px] font-bold uppercase transition-colors ${language === lang
                                    ? 'bg-violet-500/25 text-violet-300 border border-violet-500/30'
                                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-transparent'
                                    }`}
                                >
                                  {lang.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>

                          {isAdmin && (
                            <Link
                              href="/admin/dashboard"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-semibold text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                            >
                              <Zap size={14} /> Admin Panel
                            </Link>
                          )}

                          <button
                            onClick={() => { setProfileDropdownOpen(false); signOut(); }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <button
                  id="navbar-signin-btn"
                  aria-label="Sign In"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_28px_rgba(124,58,237,0.5)] transition-all duration-200 active:scale-95"
                >
                  <LogIn size={15} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Bottom glow line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Dropdown backdrop */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </>
  );
}
