// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Privacy notice of the public playground above the AI inputs: one persistent line that names the external AI
 * providers and links to the privacy page, plus a confirmation button until the visitor has confirmed it.
 * Renders nothing while the playground limit is inactive.
 * @param compact - Narrow variant for the floating voice shell: the short text is shown once the notice is confirmed
 * @param pendingOnly - Render only while the confirmation is still outstanding
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  PLAYGROUND_CHAT_NOTICE_I18N_KEY,
  PLAYGROUND_CHAT_NOTICE_SHORT_I18N_KEY,
  PLAYGROUND_NOTICE_ACKNOWLEDGE_I18N_KEY,
  PLAYGROUND_NOTICE_LINK_I18N_KEY,
  PLAYGROUND_PRIVACY_ROUTE,
} from 'src/app/domain/constants/playground.constants';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';

@Component({
  selector: 'app-playground-notice',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './playground-notice.component.html',
  styleUrl: './playground-notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundNoticeComponent {
  private readonly gate = inject(PlaygroundPromptGateService);

  readonly compact = input(false);
  readonly pendingOnly = input(false);

  readonly confirmationPending = this.gate.confirmationPending;
  readonly visible = computed(
    () => this.gate.limitActive() && (!this.pendingOnly() || this.gate.confirmationPending()),
  );
  readonly textKey = computed(() =>
    this.compact() && !this.gate.confirmationPending()
      ? PLAYGROUND_CHAT_NOTICE_SHORT_I18N_KEY
      : PLAYGROUND_CHAT_NOTICE_I18N_KEY,
  );

  readonly privacyRoute = PLAYGROUND_PRIVACY_ROUTE;
  readonly linkKey = PLAYGROUND_NOTICE_LINK_I18N_KEY;
  readonly acknowledgeKey = PLAYGROUND_NOTICE_ACKNOWLEDGE_I18N_KEY;

  acknowledge(): void {
    this.gate.acknowledge();
  }
}
