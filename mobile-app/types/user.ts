export type UserRole = 'admin' | 'owner' | 'bidder' | 'viewer';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  avatar?: string;
}
