// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toggle button shown in the page headline on narrow screens to open/close the filter navigation panel.
 * @param open - Two-way bound open state of the navigation panel
 * @param filterActive - True when the list is filtered, shows an indicator dot on the button
 */

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-nav-toggle',
  templateUrl: './nav-toggle.component.html',
  styleUrls: ['./nav-toggle.component.scss'],
  standalone: true,
  imports: [TranslateModule],
})
export class NavToggleComponent {
  readonly open = model(false);
  readonly filterActive = input(false);

  toggle(): void {
    this.open.update((value) => !value);
  }
}
