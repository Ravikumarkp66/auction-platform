export const initialTournamentConfig = {
  name: "Chettanahalli Premier League",
  totalTeams: 6,
  baseBudget: 50000
}

export const initialTeams = [
  { id: 1, name: "Team A", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-blue-600" },
  { id: 2, name: "Team B", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-purple-600" },
  { id: 3, name: "Team C", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-orange-600" },
  { id: 4, name: "Team D", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-red-600" },
  { id: 5, name: "Team E", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-emerald-600" },
  { id: 6, name: "Team F", totalBudget: 50000, remainingBudget: 50000, players: [], color: "bg-yellow-600" },
];

export const initialPlayers = [
  { id: 1, name: "Ramesh Sharma", role: "Batsman", village: "Koratagere", age: 24, basePrice: 2000, soldPrice: null, team: null, status: "available" },
  { id: 2, name: "Rahul Kumar", role: "All-Rounder", village: "Tumkur", age: 22, basePrice: 1500, soldPrice: null, team: null, status: "available" },
  { id: 3, name: "Arjun Singh", role: "Bowler", village: "Makenahalli", age: 26, basePrice: 2500, soldPrice: null, team: null, status: "available" },
  { id: 4, name: "Vikram Patil", role: "Wicket Keeper", village: "Chettanahalli", age: 21, basePrice: 3000, soldPrice: null, team: null, status: "available" },
  { id: 5, name: "Manoj Deshmukh", role: "Batsman", village: "Koratagere", age: 25, basePrice: 1000, soldPrice: null, team: null, status: "available" },
  { id: 6, name: "Kiran Gowda", role: "All-Rounder", village: "Tumkur", age: 23, basePrice: 2000, soldPrice: null, team: null, status: "available" },
];
