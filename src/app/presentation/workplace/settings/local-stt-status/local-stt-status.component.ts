// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Presentational status block of the local speech recognition, shared by the speech settings and the plugin card:
 * the install state line, the hints of a running or stuck operation and a retry hint when the status is unavailable.
 * It sits in a polite live region so screen readers announce the polled changes. Extra status columns are projected.
 * @param view - Derived plugin state to render
 * @param statusElementId - Optional DOM id of the status text, so each host keeps its own unique id
 * @param retry - Emits when the user asks to load the status again
 */
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocalSttStatusView } from 'src/app/domain/models/assistant/local-stt-status-view.interface';

@Component({
  selector: 'app-local-stt-status',
  templateUrl: './local-stt-status.component.html',
  styleUrls: ['./local-stt-status.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalSttStatusComponent {
  public readonly view = input.required<LocalSttStatusView>();
  public readonly statusElementId = input<string | null>(null);
  public readonly retry = output<void>();
}
