"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  PlusCircle, 
  Trophy, 
  Users, 
  TrendingUp, 
  PlayCircle,
  Clock
} from "lucide-react";

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    liveTournaments: 0,
    totalPlayers: 0,
    totalTeams: 0,
  });

  // Mock data - in production, this would come from API calls
  useEffect(() => {
    setStats({
      totalTournaments: 12,
      liveTournaments: 1,
      totalPlayers: 156,
      totalTeams: 8,
    });
  }, []);

  const quickActions = [
    {
      title: "Create Tournament",
      description: "Start a new tournament",
      icon: PlusCircle,
      href: "/admin/create-tournament",
      color: "bg-violet-500",
    },
    {
      title: "Live Tournaments",
      description: "Manage active auctions",
      icon: Trophy,
      href: "/admin/tournaments",
      color: "bg-blue-500",
    },
    {
      title: "Past Tournaments",
      description: "View completed auctions",
      icon: Clock,
      href: "/admin/tournaments/past",
      color: "bg-purple-500",
    },
  ];

  const statCards = [
    {
      title: "Total Tournaments",
      value: stats.totalTournaments,
      icon: Trophy,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
    {
      title: "Live Now",
      value: stats.liveTournaments,
      icon: PlayCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Total Players",
      value: stats.totalPlayers,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Teams",
      value: stats.totalTeams,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400">Welcome back, {session?.user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors group"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white group-hover:text-violet-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-white">Village Premier League started</p>
                <p className="text-xs text-slate-400">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-white">Player "Rohit Kumar" sold for ₹45,000</p>
                <p className="text-xs text-slate-400">5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-white">College Cup Auction completed</p>
                <p className="text-xs text-slate-400">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
