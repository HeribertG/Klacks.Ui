// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Progress card of the onboarding tour inside the assistant chat: title, done/total progress, a back
 * step, start or resume and dismiss. Drives the chat's component-scoped ChatOnboardingTourService.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { OnboardingService } from 'src/app/application/services/onboarding.service';
import { ChatOnboardingTourService } from '../services/chat-onboarding-tour.service';

@Component({
  selector: 'app-chat-onboarding-card',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './chat-onboarding-card.component.html',
  styleUrls: ['./chat-onboarding-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatOnboardingCardComponent {
  readonly tour = inject(ChatOnboardingTourService);
  readonly onboarding = inject(OnboardingService);
}
