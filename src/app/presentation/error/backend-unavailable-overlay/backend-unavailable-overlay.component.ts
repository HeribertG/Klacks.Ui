// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Full-screen "please wait" overlay shown while the backend is unreachable (e.g. still starting
 * up on a freshly installed database), instead of the generic error page. After a while it also
 * offers a manual reload in case the backend never comes back on its own.
 */
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BackendAvailabilityService } from 'src/app/application/services/backend-availability.service';

const RELOAD_HINT_DELAY_MS = 60000;

@Component({
  selector: 'app-backend-unavailable-overlay',
  templateUrl: './backend-unavailable-overlay.component.html',
  styleUrls: ['./backend-unavailable-overlay.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendUnavailableOverlayComponent {
  readonly backendAvailability = inject(BackendAvailabilityService);
  readonly showReloadHint = signal(false);
  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (this.backendAvailability.isUnavailable()) {
        this.hintTimer = setTimeout(() => this.showReloadHint.set(true), RELOAD_HINT_DELAY_MS);
      } else if (this.hintTimer) {
        clearTimeout(this.hintTimer);
        this.hintTimer = null;
        this.showReloadHint.set(false);
      }
    });
  }

  reload(): void {
    window.location.reload();
  }
}
