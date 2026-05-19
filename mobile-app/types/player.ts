export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'WK';
export type PlayerStatus = 'available' | 'sold' | 'unsold' | 'current';

export interface Player {
  _id: string;
  name: string;
  role: PlayerRole;
  basePrice: number;
  image?: string;
  teamId?: string;
  status: PlayerStatus;
  currentBid?: number;
  highestBidder?: string; // Team ID
  tournamentId?: string;
}
