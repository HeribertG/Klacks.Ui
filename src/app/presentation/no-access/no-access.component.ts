// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Page shown when the user lacks the required role for the requested route.
 * Navigates back to the root when the button is clicked.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';

@Component({
  selector: 'app-no-access',
  templateUrl: './no-access.component.html',
  styleUrl: './no-access.component.scss',
  imports: [TranslateModule, RouterModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoAccessComponent {
  private navigationService = inject(NavigationService);

  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}
