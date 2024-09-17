import { Injectable, Inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard  {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (
      this.authService.authenticated() &&
      this.authService.isAuthorised(state.url)
    ) {
      return true;
    } else {
      this.router.navigate(['/']);
      return false;
    }
  }
}
