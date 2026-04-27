"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthButton from './AuthButton';
import AuthModal from './AuthModal';
import { API_URL, getMediaUrl } from '../lib/apiConfig';

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [customLogo, setCustomLogo] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchBrandSettings();
  }, []);

  const fetchBrandSettings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/settings`);
      const data = await res.json();
      if (data.success && data.data.brandLogo) {
        setCustomLogo(getMediaUrl(data.data.brandLogo));
      }
    } catch (err) {
      console.error("Brand fetch error:", err);
    }
  };

  // Hide navbar on these app-specific screens
  if (pathname === '/auction' || pathname === '/live-auction' || pathname === '/overlay' || pathname.startsWith('/team/') || pathname.startsWith('/admin')) {
    return null;
  }

  if (!mounted) {
    return (
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between opacity-0">
          <div className="text-white font-bold text-xl tracking-tight">Auction Pro</div>
        </div>
      </nav>
    );
  }

  const isActive = (path) => pathname === path;

  // Dynamic nav links based on user role
  const isAdmin = session?.user?.role === 'admin';
  
  // Common links - visible to all users
  const commonLinks = [
    { href: '/', label: 'Home' },
    { 
      href: '/auctions', 
      label: '🔴 Live Auction', 
      isLive: true 
    }
  ];
  
  // Admin-only links
  const adminLinks = [
    { href: '/services', label: 'Services' },
    { href: '/about', label: 'About' },
  ];
  
  // Combine links based on role
  const navLinks = isAdmin ? [...adminLinks, ...commonLinks] : commonLinks;

  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="hidden md:flex flex-shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group transition-all duration-300 hover:scale-[1.03]" onClick={() => setMenuOpen(false)}>
              {/* VIBRANT LEAGUE STRIKE MARK */}
              <div className="relative flex items-center justify-center">
                {/* Subtle core radiance */}
                <div className="absolute inset-0 bg-violet-600/20 blur-[10px] rounded-full scale-125 group-hover:bg-violet-500/40 transition-all duration-500" />
                
                <svg className="w-11 h-11 relative" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                   {/* Bold Intersecting Elements (The Strike) */}
                   {/* Auction Gavel - Neon Accent */}
                   <path d="M40 80L75 45" stroke="#A855F7" strokeWidth="10" strokeLinecap="round" className="drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                   <rect x="68" y="28" width="24" height="14" rx="3" transform="rotate(-45 68 28)" fill="#A855F7" className="drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                   
                   {/* Cricket Bat - Titanium Grade */}
                   <path d="M45 45L80 80" stroke="white" strokeWidth="10" strokeLinecap="round" />
                   <path d="M80 80L88 88" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
                   
                   {/* Championship Gold Core */}
                   <circle cx="60" cy="60" r="8" fill="#FBBF24" className="animate-pulse shadow-gold" />
                   <circle cx="60" cy="60" r="12" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[spin_10s_linear_infinite]" />
                </svg>
              </div>

              {/* Bold Cinematic Typography */}
              <div className="flex flex-col">
                <span className="text-2xl font-[1000] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-violet-400 leading-[0.85] uppercase drop-shadow-md">
                  LAKSHMISH
                </span>
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-violet-500 mt-1 pl-0.5 opacity-90">
                  Cricket Events
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex flex-1 items-center justify-center">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-violet-400 transition-colors text-sm font-medium px-4 py-2 ${
                  link.isLive 
                    ? 'text-red-400 font-bold' 
                    : isActive(link.href) 
                      ? 'text-violet-400' 
                      : 'text-gray-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Switcher Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                🌐 {language.toUpperCase()} ▼
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                {['en', 'hi', 'kn'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => changeLanguage(lang)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors first:rounded-t-xl last:rounded-b-xl ${
                      language === lang ? 'bg-violet-500/20 text-violet-400' : 'text-gray-300'
                    }`}
                  >
                    {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Kannada'}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Panel Button — gold, only for admins */}
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-black
                  bg-gradient-to-r from-yellow-400 to-yellow-500
                  shadow-[0_0_15px_rgba(255,215,0,0.5)]
                  hover:shadow-[0_0_25px_rgba(255,215,0,0.85)]
                  hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
              >
                ⚡ Admin Panel
              </Link>
            )}

            {/* Simple Sign In/Out Button */}
            <AuthButton />
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between w-full px-1">
            {/* Logo - Extremely small */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                <div className="relative">
                   <div className="absolute inset-0 bg-violet-600/30 blur-md rounded-full scale-110" />
                   <svg className="w-7 h-7 relative" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M40 85L80 45" stroke="#A855F7" strokeWidth="10" strokeLinecap="round" />
                      <rect x="70" y="30" width="25" height="15" rx="4" transform="rotate(-45 70 30)" fill="#A855F7" />
                      <path d="M45 40L85 80" stroke="white" strokeWidth="10" strokeLinecap="round" />
                      <circle cx="62.5" cy="62.5" r="8" fill="#FBBF24" />
                   </svg>
                </div>
                <span className="text-white font-[900] text-sm tracking-tighter">L<span className="text-violet-500">CE</span></span>
              </Link>
            </div>

            {/* Mobile Right Side - Minimal buttons */}
            <div className="flex items-center gap-0.5">
              {/* Signin Button - Tiny */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white w-5 h-5 rounded text-xs flex items-center justify-center transition-all flex-shrink-0"
                title="Sign In"
              >
                🔐
              </button>

              {/* Mobile menu button - Tiny */}
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="w-5 h-5 flex flex-col items-center justify-center gap-[0.5px] rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all flex-shrink-0"
                aria-label="Toggle menu"
              >
                <span className={`block w-2 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[2.5px]' : ''}`}></span>
                <span className={`block w-2 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
                <span className={`block w-2 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[2.5px]' : ''}`}></span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-slate-900/98 backdrop-blur-xl border-t border-slate-800/50 px-4 pt-3 pb-5 space-y-1 max-h-[500px] overflow-y-auto">
            
            {/* Mobile Navigation Links */}
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                  isActive(link.href)
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Profile Section */}
            <div className="border-t border-slate-800/50 pt-4 mt-4 space-y-2">
              {/* Mobile Language Switcher */}
              <div className="px-4 py-2">
                <div className="text-xs text-gray-500 mb-2">Language</div>
                <div className="flex gap-2">
                  {['en', 'hi', 'kn'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => changeLanguage(lang)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                        language === lang 
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                          : 'bg-slate-800 text-gray-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'KN'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Admin Panel Button */}
              {session?.user?.role === 'admin' && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 mx-4 py-3 rounded-xl text-sm font-bold text-black
                    bg-gradient-to-r from-yellow-400 to-yellow-500
                    shadow-[0_0_15px_rgba(255,215,0,0.4)]
                    hover:shadow-[0_0_25px_rgba(255,215,0,0.7)]
                    transition-all duration-200"
                >
                  ⚡ Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </nav>
  );
}
