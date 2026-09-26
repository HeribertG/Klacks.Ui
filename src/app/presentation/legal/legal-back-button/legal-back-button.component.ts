// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Close button of the legal pages (imprint, privacy policy): returns to the page the visitor came
 * from; when the legal page was opened directly it opens the dashboard for a signed-in user and the
 * login page for an anonymous visitor.
 */
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from 'src/app/presentation/auth/auth.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-legal-back-button',
  templateUrl: './legal-back-button.component.html',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalBackButtonComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly navigationService = inject(NavigationService);
  private readonly authService = inject(AuthService);

  close(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
      return;
    }

    if (this.authService.authenticated()) {
      this.navigationService.navigateToDashboard();
      return;
    }

    void this.navigationService.navigateToRoot();
  }
}
