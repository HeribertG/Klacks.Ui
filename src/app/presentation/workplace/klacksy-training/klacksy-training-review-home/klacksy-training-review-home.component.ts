// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin entry page for the Klacksy training review tool.
 * Layout container: delegates to review / feedback / metrics sub-components via tabs.
 */
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingReviewComponent } from '../klacksy-training-review/klacksy-training-review.component';
import { KlacksyTrainingFeedbackReviewComponent } from '../klacksy-training-feedback-review/klacksy-training-feedback-review.component';
import { KlacksyTrainingMetricsComponent } from '../klacksy-training-metrics/klacksy-training-metrics.component';
import { KlacksyTrainingManualComponent } from '../klacksy-training-manual/klacksy-training-manual.component';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { DomainEventType, KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';
import {
  KLACKSY_TRAINING_TAB_FEEDBACK,
  KLACKSY_TRAINING_TAB_MANUAL,
  KLACKSY_TRAINING_TAB_METRICS,
  KLACKSY_TRAINING_TAB_TARGETS,
  KlacksyTrainingTab,
} from './klacksy-training-tab-keys.constants';
import { KLACKSY_TRAINING_TARGET_TABS } from './klacksy-training-target-tabs.constants';

@Component({
  selector: 'app-klacksy-training-review-home',
  standalone: true,
  imports: [TranslateModule, KlacksyTrainingReviewComponent, KlacksyTrainingFeedbackReviewComponent, KlacksyTrainingMetricsComponent, KlacksyTrainingManualComponent],
  templateUrl: './klacksy-training-review-home.component.html',
  styleUrls: ['./klacksy-training-review-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingReviewHomeComponent {
  private readonly eventBus = inject(EVENT_BUS_TOKEN);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<KlacksyTrainingTab>(KLACKSY_TRAINING_TAB_TARGETS);

  protected readonly TAB_TARGETS = KLACKSY_TRAINING_TAB_TARGETS;
  protected readonly TAB_FEEDBACK = KLACKSY_TRAINING_TAB_FEEDBACK;
  protected readonly TAB_METRICS = KLACKSY_TRAINING_TAB_METRICS;
  protected readonly TAB_MANUAL = KLACKSY_TRAINING_TAB_MANUAL;

  constructor() {
    this.eventBus
      .on<KlacksyTargetRequestedEvent>(DomainEventType.KLACKSY_TARGET_REQUESTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ target }) => {
        const tab = KLACKSY_TRAINING_TARGET_TABS[target];
        if (tab) {
          this.activeTab.set(tab);
        }
      });
  }

  protected setTab(t: KlacksyTrainingTab): void { this.activeTab.set(t); }
}
