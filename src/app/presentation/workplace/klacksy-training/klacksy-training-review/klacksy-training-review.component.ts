// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Admin view: list of navigation targets with filter + selection, delegates editing
 * to the synonym editor component.
 * @param status - filter signal for synonym status (pending, generated, reviewed, needs-review)
 * @param locale - filter signal for language locale (de, en, fr, it)
 */
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { DataKlacksyTrainingService, NavigationTargetDto } from '../../../../infrastructure/api/klacksy-training/data-klacksy-training.service';
import { KlacksyTrainingSynonymEditorComponent } from '../klacksy-training-synonym-editor/klacksy-training-synonym-editor.component';

import { DomainMessages } from 'src/app/domain/constants/messages';
@Component({
  selector: 'app-klacksy-training-review',
  standalone: true,
  imports: [FormField, TranslateModule, KlacksyTrainingSynonymEditorComponent],
  templateUrl: './klacksy-training-review.component.html',
  styleUrls: ['./klacksy-training-review.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KlacksyTrainingReviewComponent implements OnInit {
  private readonly service = inject(DataKlacksyTrainingService);
  private readonly formModel = signal<{ status: string; locale: string }>({ status: '', locale: DomainMessages.DEFAULT_LANG });
  protected readonly filterForm = form(this.formModel);
  protected readonly targets = signal<NavigationTargetDto[]>([]);
  protected readonly selected = signal<NavigationTargetDto | null>(null);

  ngOnInit(): void { this.reload(); }

  protected reload(): void {
    const { status, locale } = this.formModel();
    this.service.listTargets(status || undefined, locale || undefined)
      .subscribe(t => this.targets.set(t));
  }

  protected select(t: NavigationTargetDto): void { this.selected.set(t); }

  protected statusKey(s: string): string {
    return s === 'needs-review' ? 'needsReview' : s;
  }
}
