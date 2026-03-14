"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthButton from './AuthButton';

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide navbar on these app-specific screens
  if (pathname === '/auction' || pathname === '/live-auction' || pathname === '/overlay') {
    return null;
  }

  const isActive = (path) => pathname === path;

  // Dynamic nav links based on user role
  const navLinks = [
    { href: '/', label: t.navbar.home },
    { href: '/services', label: t.navbar.services },
    { href: '/tournaments', label: t.navbar.tournaments },
    { href: '/about', label: t.navbar.about },
    { href: '/contact', label: t.navbar.contact },
    // Admin-only links
    ...(session?.user?.role === 'admin' ? [
      { href: '/admin/dashboard', label: 'Admin Panel' }
    ] : [])
  ];

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-white font-bold text-xl tracking-tight" onClick={() => setMenuOpen(false)}>
              Auction<span className="text-emerald-500">Pro</span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex flex-1 items-center justify-end space-x-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`hover:text-emerald-400 transition-colors px-3 py-2 rounded-md text-sm font-medium ${isActive(link.href) ? 'text-emerald-400' : 'text-gray-300'}`}
              >
                {link.label}
              </Link>
            ))}

            <div className="ml-2">
              <AuthButton />
            </div>

            {/* Live Auction — always prominent */}
            <Link
              href="/auctions"
              className="relative ml-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
              Live Auctions
            </Link>

            <Link
              href="/booking"
              className="ml-2 border border-emerald-600 text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-md text-sm font-bold transition-all"
            >
              {t.navbar.bookMe}
            </Link>

            {/* Language switcher */}
            <div className="border-l border-slate-700 pl-3 ml-1 flex space-x-1">
              {['en', 'hi', 'kn'].map(lang => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`text-xs px-2 py-1 rounded transition-colors uppercase ${language === lang ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile right: Live Auction chip + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/auctions"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-lg"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              Live Auctions
            </Link>

            {/* Hamburger button */}
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all"
              aria-label="Toggle menu"
            >
              <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
              <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`}></span>
              <span className={`block w-5 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-slate-900/98 border-t border-slate-800 px-4 pt-3 pb-5 space-y-1">
          <div className="px-1 py-2">
            <AuthButton />
          </div>

          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                isActive(link.href)
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Divider */}
          <div className="border-t border-slate-800 my-2"></div>

          {/* Prominent Live Auction button in mobile menu */}
          <Link
            href="/auction"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/30 min-h-[52px]"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
            🔨 Live Auction Dashboard
          </Link>

          <Link
            href="/booking"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center w-full border border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-3 rounded-xl text-sm font-bold transition-all min-h-[48px]"
          >
            {t.navbar.bookMe}
          </Link>

          {/* Language switcher */}
          <div className="flex gap-2 pt-1">
            {['en', 'hi', 'kn'].map(lang => (
              <button
                key={lang}
                onClick={() => changeLanguage(lang)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${language === lang ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-gray-400 hover:text-white border border-slate-700'}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
