import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthorizationService } from '../../services/authorization.service';

export const AdminGuard: CanActivateFn = () => {
  const authorizationService = inject(AuthorizationService);
  const router = inject(Router);

  if (!authorizationService.isAdmin) {
    router.navigate(['/no-access']);
    return false;
  }

  return true;
};