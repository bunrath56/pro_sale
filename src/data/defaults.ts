import { LeadSource, ActivitySource, SalesStore, User } from '../types/sales';

export const DEFAULT_USERS: User[] = [
  {
    id: 'user_sutak',
    name: 'Su Tak',
    email: 'sutak0437@gmail.com',
    password: 'admin',
    role: 'dev',
    avatarColor: 'bg-blue-600',
    active: true,
    createdAt: '2026-10-22',
  },
  {
    id: 'admin',
    name: 'Administrator',
    email: 'admin@masterit.edu.kh',
    password: 'admin',
    role: 'dev',
    avatarColor: 'bg-indigo-600',
    active: true,
    createdAt: '2026-10-22',
  },
];

export const DEFAULT_SOURCES: LeadSource[] = [
  { id: 'ads', name: 'Paid Ads Lead', tgtW: 150, tgtL: 450, dtgtW: 6, dtgtL: 18 },
  { id: 'ref', name: 'Referral Lead', tgtW: 60, tgtL: 180, dtgtW: 2, dtgtL: 7 },
  { id: 'org', name: 'Organic Lead', tgtW: 45, tgtL: 135, dtgtW: 2, dtgtL: 5 },
  { id: 'walk', name: 'Offline Walk-in', tgtW: 30, tgtL: 90, dtgtW: 1, dtgtL: 4 },
  { id: 'evnt', name: 'Partners & Events', tgtW: 15, tgtL: 45, dtgtW: 1, dtgtL: 2 },
];

export const DEFAULT_FUS: ActivitySource[] = [
  { id: 'outb', name: 'ស្វែងរក Lead ថ្មី (Cold Calls / Outbound)', tgtW: 30, tgtA: 1500, dtgtW: 1, dtgtA: 60 },
  { id: 'futm', name: 'FU លើ This Month Leads', tgtW: 225, tgtA: 2700, dtgtW: 9, dtgtA: 108 },
  { id: 'fupm', name: 'FU លើ Previous Month Leads', tgtW: 75, tgtA: 2400, dtgtW: 3, dtgtA: 96 },
];

// Return clean empty initial sales data
export function generateInitialSalesData(): SalesStore {
  return {};
}
