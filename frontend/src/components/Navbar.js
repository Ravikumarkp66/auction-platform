"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthButton from './AuthButton';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  // Hide navbar on these app-specific screens
  if (pathname === '/auction' || pathname === '/live-auction' || pathname === '/overlay' || pathname.startsWith('/team/')) {
    return null;
  }

  const isActive = (path) => pathname === path;

  // Dynamic nav links based on user role
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/about', label: 'About' },
    // Show Live Auction to all users - goes to auctions list page
    { 
      href: '/auctions', 
      label: '🔴 Live Auction', 
      isLive: true 
    }
  ];

  return (
    <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Desktop Logo - Hidden on Mobile */}
          <div className="hidden md:flex flex-shrink-0">
            <Link href="/" className="text-white font-bold text-xl tracking-tight" onClick={() => setMenuOpen(false)}>
              Auction<span className="text-violet-500">Pro</span>
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
          <div className="hidden md:flex items-center space-x-4">
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

            {/* Simple Sign In/Out Button */}
            <AuthButton />
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between w-full px-1">
            {/* Logo - Extremely small */}
            <div className="flex-shrink-0">
              <Link href="/" className="text-white font-bold text-sm tracking-tight" onClick={() => setMenuOpen(false)}>
                A<span className="text-violet-500">P</span>
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
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </nav>
  );
}
