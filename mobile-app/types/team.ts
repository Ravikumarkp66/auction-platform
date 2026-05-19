export interface Team {
  _id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  remainingBudget: number;
  players?: string[]; // Player IDs
  color?: string;
  tournamentId?: string;
}
