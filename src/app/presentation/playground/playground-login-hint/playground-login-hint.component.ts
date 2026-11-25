// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Hint on the login page of the public playground: says that this is a demo instance with sample data, shows the
 * demo account and offers to fill it into the login form. Renders nothing on every other installation.
 * @param useDemoLogin - Emitted when the visitor asks to have the demo account filled into the login form
 */
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import {
  PLAYGROUND_DEMO_LOGIN_EMAIL,
  PLAYGROUND_DEMO_LOGIN_PASSWORD,
  PLAYGROUND_LOGIN_HINT_FILL_I18N_KEY,
  PLAYGROUND_LOGIN_HINT_TEXT_I18N_KEY,
  PLAYGROUND_LOGIN_HINT_TITLE_I18N_KEY,
} from 'src/app/domain/constants/playground.constants';
import { PlaygroundPromptGateService } from 'src/app/domain/services/playground/playground-prompt-gate.service';

@Component({
  selector: 'app-playground-login-hint',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './playground-login-hint.component.html',
  styleUrl: './playground-login-hint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaygroundLoginHintComponent {
  readonly useDemoLogin = output<void>();

  readonly visible = inject(PlaygroundPromptGateService).limitActive;

  readonly titleKey = PLAYGROUND_LOGIN_HINT_TITLE_I18N_KEY;
  readonly textKey = PLAYGROUND_LOGIN_HINT_TEXT_I18N_KEY;
  readonly fillKey = PLAYGROUND_LOGIN_HINT_FILL_I18N_KEY;
  readonly demoEmail = PLAYGROUND_DEMO_LOGIN_EMAIL;
  readonly demoPassword = PLAYGROUND_DEMO_LOGIN_PASSWORD;
}
