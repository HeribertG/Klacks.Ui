import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthService } from './auth.service';
import { NavigationService } from '../services/navigation.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);

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
      this.navigationService.navigateToRoot();
      return false;
    }
  }
}
