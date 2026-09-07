import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './auth.types';
import { AuthService } from './auth.service';
import { dashboardRouteFor } from './dashboard-route';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user) {
    return router.createUrlTree([dashboardRouteFor(user.role)]);
  }

  return true;
};

export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.currentUser()?.role === role) {
      return true;
    }

    return router.createUrlTree(['/']);
  };
}
