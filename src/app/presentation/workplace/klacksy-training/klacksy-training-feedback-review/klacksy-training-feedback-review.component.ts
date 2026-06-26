// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Displays unmatched utterances from klacksy_navigation_feedback for reviewer handling.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { KlacksyTrainingService, NavigationFeedbackDto } from '../../../../core/services/klacksy-training.service';

@Component({
  selector: 'app-klacksy-training-feedback-review',
  standalone: true,
  imports: [CommonModule, FormField, TranslateModule],
  templateUrl: './klacksy-training-feedback-review.component.html',
  styleUrls: ['./klacksy-training-feedback-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingFeedbackReviewComponent implements OnInit {
  private readonly service = inject(KlacksyTrainingService);
  private readonly formModel = signal<{ locale: string }>({ locale: 'de' });
  protected readonly localeForm = form(this.formModel);
  protected readonly items = signal<NavigationFeedbackDto[]>([]);

  ngOnInit(): void { this.reload(); }
  protected reload(): void { this.service.listFeedback(this.formModel().locale, 50).subscribe(x => this.items.set(x)); }
}
