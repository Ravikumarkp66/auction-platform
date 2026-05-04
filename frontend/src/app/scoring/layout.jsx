"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Menu, X, User, Trophy, Play, FileText, 
  Users, Search, Heart, Settings, LayoutDashboard
} from "lucide-react";

export default function ScoringLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Slide-Out Drawer Menu (like CricHeroes) ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Profile Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-center mt-4">
          <div className="w-20 h-20 rounded-full border-2 border-slate-200 overflow-hidden mb-4 bg-slate-100">
            <img src="https://ui-avatars.com/api/?name=Admin&background=f1f5f9" className="w-full h-full object-cover" alt="Profile" />
          </div>
          <h2 className="text-lg font-bold">Root Admin</h2>
          <p className="text-xs text-slate-500 font-medium">Scoring Engine</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <MenuLink href="/scoring" icon={<LayoutDashboard size={20}/>} label="Home" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/matches" icon={<FileText size={20}/>} label="My Matches" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/tournaments" icon={<Trophy size={20}/>} label="My Tournaments" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/profile" icon={<User size={20}/>} label="Profile" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/teams" icon={<Users size={20}/>} label="My Teams" current={pathname} onClick={() => setSidebarOpen(false)} />
          
          <div className="h-px bg-slate-100 my-2 mx-4"></div>
          
          <MenuLink href="/scoring/start" icon={<Play size={20}/>} label="Start Match" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/create-tournament" icon={<Trophy size={20}/>} label="Create Tournament" current={pathname} onClick={() => setSidebarOpen(false)} />
          
          <div className="h-px bg-slate-100 my-2 mx-4"></div>
          
          <MenuLink href="/scoring/following" icon={<Heart size={20}/>} label="Following" current={pathname} onClick={() => setSidebarOpen(false)} />
          <MenuLink href="/scoring/settings" icon={<Settings size={20}/>} label="Settings" current={pathname} onClick={() => setSidebarOpen(false)} />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-center text-xs text-slate-400 font-medium pb-8">
          Version 1.0.0
        </div>
      </aside>

      {/* ── Main App Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top App Bar */}
        <header className="h-16 bg-white border-b border-slate-100 px-4 flex items-center justify-between shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Menu size={24} className="text-slate-800" />
            </button>
            <h1 className="text-lg font-bold tracking-tight">Scoring App</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-slate-100">
              <Search size={20} className="text-slate-600" />
            </button>
            <Link href="/admin/dashboard" className="text-[10px] font-bold uppercase tracking-widest bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full hover:bg-violet-200 transition">
              To Auction
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          {children}
        </main>

      </div>
    </div>
  );
}

function MenuLink({ href, icon, label, current, onClick }) {
  const isActive = current === href;
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${isActive ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-500' : 'text-slate-700 hover:bg-slate-50'}`}
    >
      <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{icon}</span>
      <span className="font-semibold text-[15px]">{label}</span>
      {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
    </Link>
  );
}

function ChevronRight({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
  );
}
