"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/lib/apiConfig";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalVisits: 0,
    recentUnique: 0,
    totalUnique: 0,
    dailyStats: [],
    totalUsers: 0
  });

  const [reaches, setReaches] = useState({
    visitors: [],
    users: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch stats and reaches
    Promise.all([
      fetch(`${API_URL}/api/visitors/stats`).then(res => res.json()),
      fetch(`${API_URL}/api/visitors/reaches`).then(res => res.json())
    ])
    .then(([statsData, reachesData]) => {
      setStats(statsData);
      if (reachesData.success) {
        setReaches({
          visitors: reachesData.visitors || [],
          users: reachesData.users || []
        });
      }
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch analytics:", err);
      setLoading(false);
    });
  }, []);

  // Format date helper
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Helper to get device info from User Agent
  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return "Unknown Device";
    if (userAgent.includes("Windows NT 10.0")) return "Windows 10/11";
    if (userAgent.includes("Windows NT")) return "Windows";
    if (userAgent.includes("Mac OS X")) return "Mac OS";
    if (userAgent.includes("Android")) return "Android Device";
    if (userAgent.includes("iPhone")) return "iPhone";
    if (userAgent.includes("iPad")) return "iPad";
    if (userAgent.includes("Linux")) return "Linux";
    return "Unknown Device";
  };
  
  // Helper to get browser info from User Agent
  const getBrowserInfo = (userAgent) => {
    if (!userAgent) return "";
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
    if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Edg")) return "Edge";
    return "";
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8 mt-10">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#111c21] border border-[#1e3a35] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#2ed573]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Site Reach Analytics</h1>
            <p className="text-xs font-bold tracking-[0.1em] text-[#64718a] uppercase mt-1">Real-time Visitor Monitoring</p>
          </div>
        </div>

        {/* Top Cards & Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Cards */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-[#12141d] rounded-2xl p-6 border border-[#1f2332] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2ed573] to-transparent opacity-20"></div>
              <p className="text-[10px] font-bold tracking-widest text-[#64718a] uppercase mb-2">Total Page Hits</p>
              <h2 className="text-5xl font-black text-white">{loading ? "..." : stats.totalVisits}</h2>
              <p className="text-xs font-bold text-[#2ed573] uppercase mt-4">All Time Reach</p>
            </div>

            <div className="bg-[#12141d] rounded-2xl p-6 border border-[#1f2332] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8e44ad] to-transparent opacity-20"></div>
              <p className="text-[10px] font-bold tracking-widest text-[#64718a] uppercase mb-2">Unique Visitors (24h)</p>
              <h2 className="text-4xl font-black text-white">{loading ? "..." : stats.recentUnique}</h2>
              <p className="text-xs font-bold text-[#8e44ad] uppercase mt-4">Active Engagement</p>
            </div>
          </div>

          {/* Right Chart */}
          <div className="bg-[#12141d] rounded-2xl p-6 border border-[#1f2332] shadow-lg lg:col-span-2 relative flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-lg font-bold text-white">7-Day Trend</h3>
                <p className="text-[10px] font-bold tracking-widest text-[#64718a] uppercase mt-1">Traffic Volume Distribution</p>
              </div>
              <button className="px-4 py-1.5 rounded-lg border border-[#2c3248] text-[10px] font-bold tracking-wider text-[#64718a] hover:bg-[#1a1e2b] transition-colors uppercase">
                Updates Live
              </button>
            </div>

            {/* Simple CSS Chart */}
            <div className="flex-1 flex items-end justify-between px-4 mt-auto">
              {stats.dailyStats && stats.dailyStats.length > 0 ? (
                stats.dailyStats.slice(-7).map((day, idx) => {
                  const maxCount = Math.max(...stats.dailyStats.map(d => d.count), 1);
                  const heightPercent = Math.max((day.count / maxCount) * 100, 5); // min 5%
                  const dayName = new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  
                  return (
                    <div key={idx} className="flex flex-col items-center gap-4 group">
                      <div className="h-40 w-12 flex items-end justify-center">
                        <div 
                          className="w-full bg-[#1e2336] group-hover:bg-[#8e44ad] rounded-t-sm transition-all duration-300 relative"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-xs font-bold text-white bg-[#0b0c10] px-2 py-1 rounded">
                            {day.count}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold tracking-wider text-[#64718a]">{dayName}</span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#64718a] text-sm font-medium">
                  {loading ? 'Loading data...' : 'Not enough data for trend'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Accounts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          
          {/* Signed Up Users */}
          <div className="bg-[#12141d] rounded-2xl border border-[#1f2332] shadow-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#1f2332] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3498db]"></span>
                  Registered Accounts
                </h3>
                <p className="text-[10px] font-bold tracking-widest text-[#64718a] uppercase mt-1">Users who signed up</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-[#1e2336] text-xs font-bold text-[#3498db]">
                {reaches.users.length} Total
              </div>
            </div>
            
            <div className="p-0 overflow-y-auto max-h-[600px] custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-[#64718a]">Loading...</div>
              ) : reaches.users.length === 0 ? (
                <div className="p-8 text-center text-[#64718a]">No registered users found.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#161925] sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-bold text-[#64718a] uppercase tracking-wider">User / Email</th>
                      <th className="p-4 text-xs font-bold text-[#64718a] uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2332]">
                    {reaches.users.map((user) => (
                      <tr key={user._id} className="hover:bg-[#161925]/50 transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{user.name || "Unknown User"}</span>
                            <span className="text-sm text-[#3498db]">{user.email}</span>
                            {user.role && (
                              <span className="text-[10px] uppercase font-bold text-[#64718a] mt-1 bg-[#1e2336] w-max px-2 py-0.5 rounded">
                                {user.role}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-[#8c9bb1]">
                          <div className="flex flex-col">
                            <span>{formatDate(user.lastLogin)}</span>
                            <span className="text-xs text-[#64718a] mt-1">Logins: {user.loginCount}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Anonymous Visitors */}
          <div className="bg-[#12141d] rounded-2xl border border-[#1f2332] shadow-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#1f2332] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f39c12]"></span>
                  Anonymous Reaches
                </h3>
                <p className="text-[10px] font-bold tracking-widest text-[#64718a] uppercase mt-1">Visitors without sign up</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-[#1e2336] text-xs font-bold text-[#f39c12]">
                {reaches.visitors.length} Total
              </div>
            </div>
            
            <div className="p-0 overflow-y-auto max-h-[600px] custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-[#64718a]">Loading...</div>
              ) : reaches.visitors.length === 0 ? (
                <div className="p-8 text-center text-[#64718a]">No visitor reaches found.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#161925] sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-bold text-[#64718a] uppercase tracking-wider">Device Details</th>
                      <th className="p-4 text-xs font-bold text-[#64718a] uppercase tracking-wider">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2332]">
                    {reaches.visitors.map((visitor) => {
                      const device = getDeviceInfo(visitor.userAgent);
                      const browser = getBrowserInfo(visitor.userAgent);
                      return (
                        <tr key={visitor._id} className="hover:bg-[#161925]/50 transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-white flex items-center gap-2">
                                {device} 
                                {browser && <span className="text-xs text-[#f39c12]">({browser})</span>}
                              </span>
                              <span className="text-xs text-[#64718a] mt-1 break-all max-w-[250px] truncate" title={visitor.userAgent}>
                                IP: {visitor.ip?.replace('::ffff:', '') || "Unknown"}
                              </span>
                              <span className="text-xs text-[#64718a]">
                                Path: {visitor.path || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-[#8c9bb1]">
                            {formatDate(visitor.timestamp)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #12141d;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2332;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2c3248;
        }
      `}</style>
    </div>
  );
}
