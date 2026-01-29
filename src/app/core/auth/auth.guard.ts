import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Optional: check for token in URL (callback)
  const token = route.queryParamMap.get('token');
  if (token) {
    authService.handleCallback(token);
    return false; // handleCallback navigates
  }

  return router.createUrlTree(['/login']);
};
