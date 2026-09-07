import { Role } from './auth.types';

export function dashboardRouteFor(role: Role): string {
  return role === 'Librarian' ? '/librarian' : '/member';
}
