"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Settings, Save, User, Shield, Bell } from "lucide-react";

export default function AdminSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "AuctionPro",
    siteDescription: "Professional Cricket Auction Platform",
    allowPublicViewing: true,
    requireAuthForBidding: true,
    autoSaveInterval: 30,
    emailNotifications: true,
    pushNotifications: false
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400">Manage your platform settings and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-medium">
                {session?.user?.name?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{session?.user?.name}</p>
              <p className="text-slate-400 text-sm">{session?.user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Administrator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">General Settings</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({...settings, siteName: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Site Description
            </label>
            <textarea
              value={settings.siteDescription}
              onChange={(e) => setSettings({...settings, siteDescription: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Allow Public Viewing</p>
              <p className="text-slate-400 text-sm">Anyone can view live auctions without signing in</p>
            </div>
            <button
              onClick={() => setSettings({...settings, allowPublicViewing: !settings.allowPublicViewing})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.allowPublicViewing ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowPublicViewing ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Require Auth for Bidding</p>
              <p className="text-slate-400 text-sm">Users must be authenticated to place bids</p>
            </div>
            <button
              onClick={() => setSettings({...settings, requireAuthForBidding: !settings.requireAuthForBidding})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireAuthForBidding ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireAuthForBidding ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-slate-400 text-sm">Receive email updates about auction activity</p>
            </div>
            <button
              onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.emailNotifications ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Push Notifications</p>
              <p className="text-slate-400 text-sm">Browser notifications for live events</p>
            </div>
            <button
              onClick={() => setSettings({...settings, pushNotifications: !settings.pushNotifications})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.pushNotifications ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pushNotifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Auto-save Interval (seconds)
            </label>
            <input
              type="number"
              value={settings.autoSaveInterval}
              onChange={(e) => setSettings({...settings, autoSaveInterval: parseInt(e.target.value) || 30})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              min="10"
              max="300"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
