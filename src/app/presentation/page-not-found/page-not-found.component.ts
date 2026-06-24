// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Page shown when the router cannot match the requested URL.
 * Navigates back to the root when the button is clicked.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss',
  imports: [TranslateModule, RouterModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNotFoundComponent {
  private navigationService = inject(NavigationService);

  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}
