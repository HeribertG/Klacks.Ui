// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Page shown when a route guard refused the navigation. It distinguishes a missing right from a
 * feature that is not activated in this installation, so the page never claims a rights problem
 * the user could ask an administrator to fix when the feature simply is not there.
 * The reason is read from the query parameter rather than from a service, so a deep link or a
 * reload still shows the right sentence; it is read as a signal because Angular reuses this
 * component across redirects and a snapshot would go stale on the second one.
 * Navigates back to the root when the button is clicked.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import {
  NO_ACCESS_FEATURE_DISABLED_KEY,
  NO_ACCESS_PERMISSION_KEY,
  NO_ACCESS_REASON_FEATURE,
  NO_ACCESS_REASON_QUERY_PARAM,
} from 'src/app/domain/constants/no-access-reason.constants';

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

  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParamMap);

  /** Falls back to the rights wording, which is what this page meant before reasons existed. */
  readonly messageKey = computed(() =>
    this.queryParams()?.get(NO_ACCESS_REASON_QUERY_PARAM) === NO_ACCESS_REASON_FEATURE
      ? NO_ACCESS_FEATURE_DISABLED_KEY
      : NO_ACCESS_PERMISSION_KEY,
  );

  onClick(): void {
    this.navigationService.navigateToRoot();
  }
}
