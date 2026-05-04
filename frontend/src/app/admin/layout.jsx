"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, createContext, useContext, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  Trophy,
  Users,
  Zap,
  Image as ImageIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  User,
  Layout,
  Star,
  ChevronDown,
  Check,
  Palette,
  Home,
  Eye
} from "lucide-react";
import { API_URL } from "../../lib/apiConfig";

// Create a Context for the selected Auction
const AuctionContext = createContext(null);

export const useAuction = () => useContext(AuctionContext);

const navigation = [
  { name: "Dashboard",      href: "/admin/dashboard",          icon: LayoutDashboard, emoji: "📊" },
  { name: "Auctions",       href: "/admin/tournaments",        icon: Trophy,          emoji: "🏏" },
  { name: "Teams",          href: "/admin/teams",              icon: Layout,          emoji: "👥" },
  { name: "Players",        href: "/admin/players",            icon: User,            emoji: "🧍" },
  { name: "Icon Players",   href: "/admin/icons",              icon: Star,            emoji: "⭐" },
  { name: "Live Control",   href: "/live-auction",             icon: Zap,             emoji: "⚡" },
  { name: "Live Scoring",   href: "/scoring",                  icon: LayoutDashboard, emoji: "📱" },
  { name: "Match Control",  href: "/admin/matches",            icon: LayoutDashboard, emoji: "🎮" },
  { name: "Branding",       href: "/admin/assets",             icon: Palette,         emoji: "🎨" },
  { name: "Landing Editor", href: "/admin/landing",            icon: Layout,          emoji: "🏗️" },
  { name: "Pricing & Services", href: "/admin/services", icon: LayoutDashboard, emoji: "💰" },
  { name: "Settings",       href: "/admin/settings",           icon: ImageIcon,       emoji: "⚙️" },
];

export default function AdminLayout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [pendingApplications, setPendingApplications] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuction = localStorage.getItem("selectedAuction");
      if (savedAuction) {
        try {
          setSelectedAuction(JSON.parse(savedAuction));
        } catch (e) {}
      }
      const savedCollapsed = localStorage.getItem("sidebarCollapsed");
      if (savedCollapsed) {
        setCollapsed(savedCollapsed === "true");
      }
    }
  }, []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // System-wide socket monitoring
  useEffect(() => {
    import("socket.io-client").then(({ io }) => {
      const socket = io(API_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true
      });
      socketRef.current = socket;
      
      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));
      socket.on("connect_error", () => setIsConnected(false));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleSelectAuction = (auction) => {
    setSelectedAuction(auction);
    localStorage.setItem("selectedAuction", JSON.stringify(auction));
    setDropdownOpen(false);
  };

  async function fetchTournaments() {
    try {
      const url = `${API_URL}/api/tournaments`;
      console.log("Fetching tournaments from:", url);
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
      }
      const data = await res.json();
      
      // Safety check: Ensure data is an array to prevent .map crashes
      const tournamentsArray = Array.isArray(data) ? data : [];
      setTournaments(tournamentsArray);
      
      const saved = localStorage.getItem("selectedAuction");
      if (!saved && tournamentsArray.length > 0) {
        const active = tournamentsArray.find(t => t.status === "active") || tournamentsArray[0];
        handleSelectAuction(active);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setTournaments([]); // Fallback to empty array
    }
  }

  // Fetch all tournaments for the selector
  useEffect(() => {
    if (status === "authenticated") {
      const timeoutId = setTimeout(() => {
        fetchTournaments();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [status]);

  // Poll for pending applications
  useEffect(() => {
    if (status === "authenticated") {
      const fetchPending = async () => {
        try {
          const res = await fetch(`${API_URL}/api/players`);
          if (res.ok) {
            const data = await res.json();
            const pendingCount = data.filter(p => p.status === 'pending').length;
            setPendingApplications(prev => {
              if (pendingCount > prev && prev !== 0) {
                // Flash alert or sound could be triggered here
              }
              return pendingCount;
            });
          }
        } catch(e) {}
      };
      
      fetchPending();
      const intervalId = setInterval(fetchPending, 15000); // Check every 15s
      return () => clearInterval(intervalId);
    }
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/login"); return; }
    if (session.user?.role !== "admin") { router.push("/"); return; }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0B0F2A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Loading Admin</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "admin") return null;

  const initials = session.user?.name?.[0]?.toUpperCase() || "A";

  return (
    <AuctionContext.Provider value={{ selectedAuction, setSelectedAuction: handleSelectAuction, allTournaments: tournaments }}>
      <div className="flex h-screen bg-[#0B0F2A] text-white overflow-hidden">

        {/* ── Mobile overlay ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ══════════ SIDEBAR ══════════ */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 
          bg-[#0f172a]/90 backdrop-blur-2xl
          border-r border-white/10
          flex flex-col
          transition-all duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-20" : "w-64"}
        `}>

          {/* Logo */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-6 h-16 border-b border-white/10 shrink-0 relative`}>
            <Link href="/" className="flex items-center gap-2 group">
              <span className={`text-lg font-black tracking-tight group-hover:text-violet-400 transition-colors ${collapsed ? 'hidden' : 'block'}`}>
                🟡 Admin <span className="text-white">Panel</span>
              </span>
              {collapsed && <span className="text-xl">🟡</span>}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Collapse Toggle (Desktop Only Ribbon) */}
            <button 
              onClick={() => {
                const newState = !collapsed;
                setCollapsed(newState);
                localStorage.setItem("sidebarCollapsed", newState);
              }}
              className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-12 bg-[#1e293b] border border-white/10 rounded-lg items-center justify-center text-slate-400 hover:text-white hover:bg-violet-600 transition-all z-50 shadow-xl"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* New: Quick link to Public Site */}
          <div className={`px-4 pt-4 ${collapsed ? 'flex justify-center' : ''}`}>
            <Link 
              href="/"
              className={`flex items-center justify-between bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-white transition-all
                ${collapsed ? 'w-10 h-10 justify-center' : 'px-4 py-3 w-full'}
              `}
              title="View Public Site"
            >
              <span className={collapsed ? 'hidden' : 'block'}>Return to Home</span>
              <Home className={collapsed ? 'w-5 h-5' : 'w-4 h-4 text-violet-500'} />
            </Link>
          </div>

          {/* Global Action */}
          <div className={`px-4 py-6 ${collapsed ? 'flex justify-center' : ''}`}>
            <Link
              href="/admin/create-tournament"
              className={`flex items-center justify-center gap-2 rounded-2xl font-black text-xs text-black transition-all
                bg-gradient-to-r from-violet-400 to-cyan-400
                shadow-[0_0_15px_rgba(139,92,246,0.3)]
                hover:shadow-[0_0_25px_rgba(139,92,246,0.6)]
                hover:scale-105 active:scale-95
                ${collapsed ? 'w-12 h-12' : 'w-full py-3'}
              `}
              onClick={() => setSidebarOpen(false)}
              title="Create Auction"
            >
              <PlusCircle className="w-5 h-5" />
              <span className={collapsed ? 'hidden' : 'block'}>🏗️ CREATE AUCTION</span>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
            {!collapsed && <p className="px-5 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Console</p>}
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.name : ""}
                  className={`
                    group flex items-center gap-3 rounded-xl text-sm font-semibold
                    transition-all duration-200 relative overflow-hidden
                    ${collapsed ? 'px-0 justify-center h-12' : 'px-4 py-3'}
                    ${isActive
                      ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <span className={`text-base grayscale group-hover:grayscale-0 transition-[filter] ${collapsed ? 'scale-110' : ''}`}>{item.emoji}</span>
                  <span className={`flex-1 transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.name}</span>
                  {item.name === "Players" && pendingApplications > 0 && !collapsed && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shrink-0 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {pendingApplications}
                    </span>
                  )}
                  {item.name === "Players" && pendingApplications > 0 && collapsed && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  )}
                  {(isActive && !collapsed) && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className={`shrink-0 border-t border-white/10 p-4 space-y-3 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            <div className={`flex items-center gap-3 ${collapsed ? 'px-0' : 'px-2'}`}>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center font-black text-lg shadow-lg shadow-violet-500/30 shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{session.user?.name}</p>
                  <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest opacity-80">Root Master</p>
                </div>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign Out"
              className={`flex items-center gap-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                ${collapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-4 py-2.5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent'}
                text-slate-500 hover:text-white
              `}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ══════════ MAIN AREA ══════════ */}
        <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300`}>
          
          {/* Background glow behind content */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          {/* ── Topbar ── */}
          <header className="shrink-0 h-14 md:h-16 flex items-center justify-between px-3 md:px-8
            border-b border-white/5 bg-[#0B0F2A]/70 backdrop-blur-xl z-30">

            <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              
              {/* AUCTION SELECTOR */}
              <div className="relative flex-1 max-w-[240px]" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all w-full"
                >
                  <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-500">Selected Auction</p>
                    <p className="text-[10px] md:text-xs font-black text-white truncate">{selectedAuction ? selectedAuction.name : "Select Auction"}</p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-[280px] bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 bg-white/5 border-b border-white/10">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Available Systems</p>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      {tournaments.map((t) => (
                        <button
                          key={t._id}
                          onClick={() => handleSelectAuction(t)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-violet-600/20 text-left transition-all border-b border-white/5 last:border-0"
                        >
                          <div>
                            <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                            <p className="text-[10px] text-slate-500 font-semibold uppercase">{t.status}</p>
                          </div>
                          {selectedAuction?._id === t._id && <Check className="w-4 h-4 text-violet-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Live Status Pill (Dynamic) */}
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isConnected ? "Server Online" : "Disconnected"}
                </span>
              </div>
              
              {/* Prioritize the LIVE auction for the Go Live button, regardless of what's selected in the editor */}
              {(() => {
                const live = tournaments.find(t => t.status === "active");
                const target = live || selectedAuction;
                return (
                  <Link 
                    href={target ? `/live-auction?id=${target._id}` : "#"}
                    className="px-3 py-2 md:px-4 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black
                      bg-gradient-to-r from-yellow-400 to-yellow-600
                      shadow-lg shadow-yellow-500/20
                      hover:scale-105 active:scale-95 transition-all"
                  >
                    {live && live._id !== selectedAuction?._id ? (
                      <span className="flex items-center gap-1">
                        LIVE: <span className="opacity-70">{live.shortId || live.name.slice(0, 3)}</span>
                      </span>
                    ) : "Go Live"}
                  </Link>
                );
              })()}
            </div>

          </header>

          {/* ── Page content ── */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-10 custom-scrollbar relative z-10">
            {children}
          </main>
        </div>
      </div>
    </AuctionContext.Provider>
  );
}
