import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Global } from '../services/global';

export const authGuard: CanActivateFn = async () => {
  const global = inject(Global);
  const router = inject(Router);

  if (global.loading()) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!global.loading()) { clearInterval(check); resolve(); }
      }, 50);
    });
  }

  if (global.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};
