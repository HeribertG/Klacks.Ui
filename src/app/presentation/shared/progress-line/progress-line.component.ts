// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Indeterminate progress line (thin sliding bar) for work whose duration or completion share is unknown.
 * @param active - Shows the line while true, renders nothing otherwise
 * @param label - Accessible name announced for the running work
 */

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-progress-line',
  templateUrl: './progress-line.component.html',
  styleUrls: ['./progress-line.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressLineComponent {
  readonly active = input(false);
  readonly label = input('');
}
