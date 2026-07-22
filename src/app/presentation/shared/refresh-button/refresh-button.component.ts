// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Icon-only refresh button that shows a spinner while loading.
 * @param isLoading - Shows a spinner and disables the button while true
 * @param disabled - Additional disable condition independent of loading state
 * @param ariaLabel - Pre-translated accessible label for the button
 * @param buttonId - Optional DOM id for the inner button (e.g. so the setup tour can target it)
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faRotate } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-refresh-button',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './refresh-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefreshButtonComponent {
  readonly isLoading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('');
  readonly buttonId = input<string | null>(null);
  readonly clicked = output<void>();

  protected readonly faRotate = faRotate;
}
