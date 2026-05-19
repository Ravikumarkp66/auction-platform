export type TournamentStatus = 'live' | 'upcoming' | 'completed';

export interface Tournament {
  _id: string;
  name: string;
  status: TournamentStatus;
  teamCount?: number;
  playerCount?: number;
  startingBudget?: number;
  squadSize?: number;
  date?: string;
  logoUrl?: string;
}
