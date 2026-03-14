"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Play } from "lucide-react";

export default function CreateTournament() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tournament, setTournament] = useState({
    name: "",
    description: "",
    status: "upcoming"
  });
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [newTeam, setNewTeam] = useState({ name: "", logo: "" });
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    role: "All Rounder",
    age: "",
    basePrice: ""
  });

  const addTeam = () => {
    if (newTeam.name.trim()) {
      setTeams([...teams, { ...newTeam, id: Date.now() }]);
      setNewTeam({ name: "", logo: "" });
    }
  };

  const removeTeam = (id) => {
    setTeams(teams.filter(team => team.id !== id));
  };

  const addPlayer = () => {
    if (newPlayer.name.trim() && newPlayer.age && newPlayer.basePrice) {
      setPlayers([...players, { 
        ...newPlayer, 
        id: Date.now(),
        age: parseInt(newPlayer.age),
        basePrice: parseInt(newPlayer.basePrice)
      }]);
      setNewPlayer({
        name: "",
        role: "All Rounder",
        age: "",
        basePrice: ""
      });
    }
  };

  const removePlayer = (id) => {
    setPlayers(players.filter(player => player.id !== id));
  };

  const handleCreateTournament = async () => {
    if (!tournament.name.trim() || teams.length === 0 || players.length === 0) {
      alert("Please fill in all required fields and add at least one team and player");
      return;
    }

    setLoading(true);
    
    try {
      // Mock API call - in production, this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("Creating tournament:", {
        ...tournament,
        teams,
        players
      });
      
      alert("Tournament created successfully!");
      router.push("/admin/tournaments");
    } catch (error) {
      alert("Error creating tournament");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament.name.trim() || teams.length === 0 || players.length === 0) {
      alert("Please create the tournament first");
      return;
    }

    setLoading(true);
    
    try {
      // Mock API call to start tournament
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const tournamentData = {
        ...tournament,
        status: "live",
        teams,
        players
      };
      
      console.log("Starting tournament:", tournamentData);
      
      alert("Tournament started successfully!");
      router.push(`/live-auction?tournament=${encodeURIComponent(tournament.name)}`);
    } catch (error) {
      alert("Error starting tournament");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Create Tournament</h1>
        <p className="text-slate-400">Set up a new auction tournament</p>
      </div>

      {/* Tournament Details */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Tournament Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tournament Name *
            </label>
            <input
              type="text"
              value={tournament.name}
              onChange={(e) => setTournament({...tournament, name: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter tournament name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={tournament.description}
              onChange={(e) => setTournament({...tournament, description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Enter tournament description"
            />
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Teams</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeam.name}
              onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Team name"
            />
            <input
              type="text"
              value={newTeam.logo}
              onChange={(e) => setNewTeam({...newTeam, logo: e.target.value})}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Logo URL (optional)"
            />
            <button
              onClick={addTeam}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {team.logo && (
                    <img src={team.logo} alt={team.name} className="w-8 h-8 rounded" />
                  )}
                  <span className="text-white">{team.name}</span>
                </div>
                <button
                  onClick={() => removeTeam(team.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Players</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              type="text"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({...newPlayer, name: e.target.value})}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Player name"
            />
            <select
              value={newPlayer.role}
              onChange={(e) => setNewPlayer({...newPlayer, role: e.target.value})}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="Batsman">Batsman</option>
              <option value="Bowler">Bowler</option>
              <option value="All Rounder">All Rounder</option>
              <option value="Wicket Keeper">Wicket Keeper</option>
            </select>
            <input
              type="number"
              value={newPlayer.age}
              onChange={(e) => setNewPlayer({...newPlayer, age: e.target.value})}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Age"
              min="15"
              max="50"
            />
            <input
              type="number"
              value={newPlayer.basePrice}
              onChange={(e) => setNewPlayer({...newPlayer, basePrice: e.target.value})}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Base Price"
              min="1000"
            />
          </div>
          <button
            onClick={addPlayer}
            className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Player
          </button>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-slate-400 text-sm">
                      {player.role} • {player.age} years • ₹{player.basePrice.toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removePlayer(player.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleCreateTournament}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? "Creating..." : "Create Tournament"}
        </button>
        <button
          onClick={handleStartTournament}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {loading ? "Starting..." : "Start Tournament"}
        </button>
      </div>
    </div>
  );
}
