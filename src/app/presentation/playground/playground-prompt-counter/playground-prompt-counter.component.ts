// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Character counter under an AI input while the public playground limit is active: appears from a share of the
 * limit, is highlighted at the limit and names the limit only once it is exceeded. Renders nothing while the limit is inactive.
 * @param length - Current number of characters in the input
 */
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  PLAYGROUND_COUNTER_VISIBLE_RATIO,
  PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';

@Component({
  selector: 'app-playground-prompt-counter',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './playground-prompt-counter.component.html',
  styleUrl: './playground-prompt-counter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundPromptCounterComponent {
  private readonly gate = inject(PlaygroundPromptGateService);

  readonly length = input.required<number>();

  readonly max = this.gate.maxPromptChars;
  readonly visible = computed(() => {
    const max = this.max();
    return max !== null && this.length() >= max * PLAYGROUND_COUNTER_VISIBLE_RATIO;
  });
  readonly atLimit = computed(() => {
    const max = this.max();
    return max !== null && this.length() >= max;
  });

  readonly exceeded = computed(() => this.gate.exceedsLength(this.length()));

  readonly tooLongKey = PLAYGROUND_PROMPT_TOO_LONG_I18N_KEY;
}
