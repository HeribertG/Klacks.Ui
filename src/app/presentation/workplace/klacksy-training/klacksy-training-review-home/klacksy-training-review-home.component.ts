// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin entry page for the Klacksy training review tool.
 * Layout container: delegates to review / feedback / metrics sub-components via tabs.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingReviewComponent } from '../klacksy-training-review/klacksy-training-review.component';
import { KlacksyTrainingFeedbackReviewComponent } from '../klacksy-training-feedback-review/klacksy-training-feedback-review.component';
import { KlacksyTrainingMetricsComponent } from '../klacksy-training-metrics/klacksy-training-metrics.component';
import { KlacksyTrainingManualComponent } from '../klacksy-training-manual/klacksy-training-manual.component';

type Tab = 'targets' | 'feedback' | 'metrics' | 'manual';

@Component({
  selector: 'app-klacksy-training-review-home',
  standalone: true,
  imports: [TranslateModule, KlacksyTrainingReviewComponent, KlacksyTrainingFeedbackReviewComponent, KlacksyTrainingMetricsComponent, KlacksyTrainingManualComponent],
  templateUrl: './klacksy-training-review-home.component.html',
  styleUrls: ['./klacksy-training-review-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingReviewHomeComponent {
  protected readonly activeTab = signal<Tab>('targets');
  protected setTab(t: Tab): void { this.activeTab.set(t); }
}
