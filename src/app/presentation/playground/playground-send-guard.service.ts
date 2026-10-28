// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Decides whether a typed or spoken prompt may leave the browser while the public playground limit is active and
 * tells the visitor why not: the privacy notice is not yet confirmed, or the prompt exceeds the character limit.
 * Always allows when the limit is inactive. While the status request is still in flight the check waits for the
 * answer, so a send never slips through before the limit is known.
 * @param text - The exact prompt string that would be sent
 * @param readText - Reads the current prompt after the wait, because it may have changed or been sent meanwhile
 */
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  PLAYGROUND_NOTICE_REQUIRED_I18N_KEY,
  PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const MAX_PARAM = 'max';

@Injectable({ providedIn: 'root' })
export class PlaygroundSendGuardService {
  private readonly gate = inject(PlaygroundPromptGateService);
  private readonly toasts = inject(ToastShowService);
  private readonly translate = inject(TranslateService);

  async allowSendWhenReady(readText: () => string): Promise<boolean> {
    if (!(await this.gate.waitForStatus())) {
      return false;
    }
    const text = readText();
    return !!text.trim() && this.allowSend(text);
  }

  allowSend(text: string): boolean {
    if (this.gate.confirmationPending()) {
      this.toasts.showInfo(this.translate.instant(PLAYGROUND_NOTICE_REQUIRED_I18N_KEY));
      return false;
    }
    if (this.gate.exceedsLimit(text)) {
      this.toasts.showError(
        this.translate.instant(PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY, { [MAX_PARAM]: this.gate.maxPromptChars() }),
      );
      return false;
    }
    return true;
  }
}
